'use client'
import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PermissionGuard from '@/components/shared/PermissionGuard'
import {
    FiUsers, FiCheckCircle, FiCalendar, FiClipboard, FiEdit3, FiSend,
    FiAlertTriangle, FiDollarSign, FiXCircle, FiTrendingUp, FiCreditCard,
    FiBriefcase, FiAward, FiBookOpen, FiPackage, FiFileText, FiActivity,
    FiArrowRight, FiCornerDownLeft,
} from 'react-icons/fi'

const STAGES = [
    {
        n: 1, tone: 'primary', icon: <FiUsers />, title: 'Patient Intake', routes: ['/medical-billing/patients'],
        desc: 'Register the patient once — name, DOB, contact details — and attach their insurance (primary, and secondary if they have one). Everything downstream is billed against this record.',
        states: [['active', 'secondary'], ['inactive', 'secondary'], ['deceased', 'secondary'], ['archived', 'secondary']],
        doneWhen: 'the patient exists with at least one insurance policy on file (or is flagged self-pay).',
    },
    {
        n: 2, tone: 'info', icon: <FiCheckCircle />, title: 'Eligibility Check', routes: ['/medical-billing/eligibility'],
        desc: 'Confirm the payer will actually cover the visit before the patient is seen — plan name, active/inactive, copay expectations. Skipping this is how self-pay surprises happen after the fact.',
        states: [['checked · eligible', 'success'], ['checked · not eligible', 'danger'], ['not configured', 'secondary']],
        doneWhen: 'you know whether the payer covers this visit — or you’ve accepted it’ll be billed self-pay.',
    },
    {
        n: 3, tone: 'primary', icon: <FiCalendar />, title: 'Schedule Appointment', routes: ['/medical-billing/appointments'],
        desc: 'Book the patient against a provider, date and time. After the visit happens, mark it completed — only completed visits generate a clinical encounter. A no-show or cancellation stops here.',
        states: [['scheduled', 'secondary'], ['confirmed', 'secondary'], ['completed', 'success'], ['no_show', 'danger'], ['cancelled', 'danger']],
        doneWhen: 'status is completed.',
    },
    {
        n: 4, tone: 'info', icon: <FiClipboard />, title: 'Encounter', routes: ['/medical-billing/encounters'],
        desc: 'The clinical record of that one visit — provider, date, place of service. It’s the container the coder works against; nothing gets coded without an encounter to code it to.',
        states: [['open', 'secondary'], ['coding', 'secondary'], ['ready', 'warning'], ['closed', 'success']],
        doneWhen: 'the visit’s diagnosis and procedures are known and it’s ready to code.',
    },
    {
        n: 5, tone: 'warning', icon: <FiEdit3 />, title: 'Charge Entry (Coding)', routes: ['/medical-billing/charges'],
        desc: 'Turn the encounter into billable lines: a CPT or HCPCS code per service, modifiers where they apply, a diagnosis pointer back to the ICD-10 code, and the place of service. This is where the dollar amount is set.',
        states: [['draft', 'secondary'], ['ready', 'warning'], ['billed', 'success'], ['voided', 'danger']],
        doneWhen: 'status is ready — every line has a valid code and amount.',
    },
    {
        n: 6, tone: 'primary', icon: <FiSend />, title: 'Generate & Submit Claim', routes: ['/medical-billing/claims', '/medical-billing/submission-status'],
        desc: 'One click turns a ready charge into an 837P claim — every charge line copies across, the patient’s primary payer attaches automatically. Validate it, then submit. Submission Status is this same table, filtered to what’s in flight.',
        states: [['draft', 'secondary'], ['ready', 'secondary'], ['submitted', 'warning'], ['accepted', 'warning'], ['voided', 'danger']],
        doneWhen: 'the payer has acknowledged receipt — status moves past submitted.',
    },
    {
        n: 7, tone: 'warning', icon: <FiAlertTriangle />, title: 'Payer Adjudication', routes: ['/medical-billing/payments', '/medical-billing/denials'],
        desc: 'The payer decides. If they pay — in full or in part — post the ERA/check on Payments and allocate it line by line; the claim recalculates automatically. If they deny it, log it on Denials with the CARC code, work it, then loop back to Stage 6 to resubmit.',
        states: [['paid', 'success'], ['partially_paid', 'warning'], ['denied', 'danger'], ['rejected', 'danger']],
        doneWhen: 'the claim is paid, or the denial is resolved and resubmitted.',
        branch: true,
    },
    {
        n: 8, tone: 'danger', icon: <FiTrendingUp />, title: 'AR & Follow-up', routes: ['/medical-billing/ar'],
        desc: 'Every claim carries an AR account that updates itself the moment a payment posts or a denial lands — you never edit a balance by hand. It tracks insurer-owed vs. patient-owed separately, and ages it into 0-30 / 31-60 / 61-90 / 90+ buckets.',
        states: [['open', 'warning'], ['follow_up', 'warning'], ['patient_balance', 'secondary'], ['resolved', 'success'], ['written_off', 'secondary']],
        doneWhen: 'insurance_balance hits zero — whatever’s left is the patient’s.',
    },
    {
        n: 9, tone: 'success', icon: <FiCreditCard />, title: 'Patient Billing', routes: ['/medical-billing/patient-payments', '/medical-billing/patient-statements'],
        desc: 'Collect whatever’s left as copay or self-pay and record it as a patient payment — that immediately brings the AR patient balance down. Statements are just AR accounts filtered to a balance above zero, grouped per patient.',
        states: [['card', 'secondary'], ['cash', 'secondary'], ['check', 'secondary']],
        doneWhen: 'patient_balance on the AR account reads zero.',
    },
    {
        n: 10, tone: 'secondary', icon: <FiBriefcase />, title: 'Deposit & Reconcile', routes: ['/medical-billing/deposits'],
        desc: 'Batch posted insurance and patient payments into a bank deposit, then match it against the actual bank statement. This is the only stage that talks to the bank, not the payer — it closes the loop from claim to cash in hand.',
        states: [['pending', 'secondary'], ['deposited', 'warning'], ['reconciled', 'success']],
        doneWhen: 'the deposit is reconciled against the bank statement.',
        isLast: true,
    },
]

const TRACKS = [
    {
        icon: <FiAward />, tone: 'primary', title: 'Providers & Credentialing',
        routes: ['/medical-billing/providers', '/medical-billing/credentialing'],
        desc: 'Provider onboarding — license verification, malpractice policy, payer enrollment. A provider must be credentialed with a payer before claims to it get paid.',
    },
    {
        icon: <FiBookOpen />, tone: 'info', title: 'Reference Data',
        routes: ['/medical-billing/master-data/icd10'],
        desc: 'The ICD-10, CPT, HCPCS, modifier and place-of-service lists that Charge Entry (Stage 5) picks codes from. Kept current here, used everywhere else.',
    },
    {
        icon: <FiPackage />, tone: 'warning', title: 'Inventory & Purchasing',
        routes: ['/medical-billing/inventory', '/medical-billing/vendors', '/medical-billing/purchase-orders'],
        desc: 'Clinic supply chain — stock levels, vendors, purchase orders. Shares the module but not the revenue cycle.',
    },
    {
        icon: <FiFileText />, tone: 'secondary', title: 'Documents',
        routes: ['/medical-billing/documents'],
        desc: 'Insurance cards, consent forms, lab results — attached to a patient, referenced from anywhere they’re needed.',
    },
    {
        icon: <FiActivity />, tone: 'success', title: 'Activity Log',
        routes: ['/medical-billing/activity'],
        desc: 'Who created, changed or submitted what, and when — the audit trail behind every stage above.',
    },
]

const LEGEND = [
    ['success', 'Green — money in, or fully resolved'],
    ['warning', 'Amber — in progress, needs attention'],
    ['danger', 'Rose — stopped, needs rework'],
    ['secondary', 'Grey — not started / closed out'],
]

const RouteChip = ({ href }) => (
    <Link href={href} className="badge bg-soft-primary text-primary text-decoration-none me-1 mb-1 font-monospace fw-normal" style={{ fontSize: 11 }}>
        {href.replace('/medical-billing', '') || '/'}
    </Link>
)

const page = () => {
    const router = useRouter()

    return (
        <PermissionGuard permission="medical_patients.view" redirect={false}>
            <PageHeader>
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <button onClick={() => router.back()} className="btn btn-outline-primary"><i className="me-2">⬅️</i>Back</button>
                </div>
            </PageHeader>

            <div className="main-content">
                {/* Intro */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body">
                        <span className="badge bg-soft-primary text-primary mb-2">Medical Billing · Internal Reference</span>
                        <h3 className="mb-2">Revenue Cycle Playbook</h3>
                        <p className="text-muted mb-3" style={{ maxWidth: 720 }}>
                            How a visit turns into paid cash in this system — in the order it actually happens, one module at a time.
                            Read it top to bottom the first time; come back to a single stage whenever you need a refresher.
                        </p>
                        <div className="d-flex flex-wrap gap-4 small text-muted">
                            <span><strong className="text-dark">Who it's for:</strong> front desk, billers, coders, AR follow-up</span>
                            <span><strong className="text-dark">Covers:</strong> 10 sequential stages + 5 supporting tracks</span>
                        </div>
                    </div>
                </div>

                {/* Pipeline strip */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body">
                        <h6 className="mb-3">The pipeline, end to end</h6>
                        <div className="d-flex flex-nowrap overflow-auto pb-2" style={{ gap: 4 }}>
                            {STAGES.map((s, i) => (
                                <React.Fragment key={s.n}>
                                    <div className="d-flex flex-column align-items-center text-center" style={{ minWidth: 92 }}>
                                        <div className={`avatar-text avatar-md bg-soft-${s.tone} text-${s.tone} mb-1`}>{s.icon}</div>
                                        <span className="fw-semibold small text-dark">{s.n}</span>
                                        <span className="text-muted" style={{ fontSize: 11, lineHeight: 1.2 }}>{s.title}</span>
                                    </div>
                                    {i < STAGES.length - 1 && (
                                        <div className="d-flex align-items-center text-muted" style={{ paddingTop: 18 }}>
                                            <FiArrowRight />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="d-flex align-items-start gap-2 mt-3 p-2 rounded bg-soft-warning" style={{ fontSize: 13 }}>
                            <FiCornerDownLeft className="text-warning mt-1 flex-shrink-0" />
                            <span className="text-dark">
                                <strong>The only fork is Stage 7.</strong> A payer either pays the claim (moves on to AR) or denies it —
                                a denial gets worked and loops back to Stage 6 for resubmission.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stage details */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-transparent">
                        <h6 className="mb-0">The ten stages</h6>
                    </div>
                    <div className="card-body">
                        {STAGES.map((s) => (
                            <div key={s.n} className={`d-flex gap-3 py-3 ${s.isLast ? '' : 'border-bottom'}`}>
                                <div className={`avatar-text avatar-lg bg-soft-${s.tone} text-${s.tone} flex-shrink-0`}>{s.icon}</div>
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                        <h6 className="mb-0">{s.n}. {s.title}</h6>
                                        {s.routes.map((r) => <RouteChip key={r} href={r} />)}
                                    </div>
                                    <p className="text-muted small mt-2 mb-2" style={{ maxWidth: 680 }}>{s.desc}</p>
                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                        {s.states.map(([label, tone]) => (
                                            <span key={label} className={`badge bg-soft-${tone} text-${tone} font-monospace fw-normal`} style={{ fontSize: 11 }}>{label}</span>
                                        ))}
                                    </div>
                                    <div className="small text-muted border-start border-3 ps-2">
                                        <strong className="text-dark">{s.isLast ? 'Done' : 'Move on'} when:</strong> {s.doneWhen}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Parallel tracks */}
                <div className="mb-2">
                    <h6 className="mb-1">Runs alongside, not in the line</h6>
                    <p className="text-muted small mb-3">These aren't steps in the claim's journey — they're standing setup and support the pipeline above depends on.</p>
                </div>
                <div className="row g-3 mb-4">
                    {TRACKS.map((t) => (
                        <div className="col-md-4 col-sm-6" key={t.title}>
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <div className={`avatar-text avatar-md bg-soft-${t.tone} text-${t.tone} mb-2`}>{t.icon}</div>
                                    <h6 className="mb-1">{t.title}</h6>
                                    <div className="mb-2">
                                        {t.routes.map((r) => <RouteChip key={r} href={r} />)}
                                    </div>
                                    <p className="text-muted small mb-0">{t.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        <h6 className="mb-3">Reading the status colors</h6>
                        <p className="text-muted small mb-3">The same colors mean the same thing on every page in the module.</p>
                        <div className="d-flex flex-wrap gap-2">
                            {LEGEND.map(([tone, label]) => (
                                <span key={tone} className={`badge bg-soft-${tone} text-${tone} p-2`}>{label}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PermissionGuard>
    )
}

export default page
