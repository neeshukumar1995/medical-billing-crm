"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Search } from "lucide-react";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

// =====================
// STATUSES
// =====================
const STATUSES = ["Lead", "Qualified", "Proposal", "Negotiation", "Converted", "Closed"];

// =====================
// DATA
// =====================
const initialData = [
  { id: "1", name: "Stan Alvarez", company: "Wondertrust", amount: 25000, status: "Lead" },
  { id: "2", name: "Sohrab Amin", company: "Wondertrust", amount: 0, status: "Lead" },
  { id: "3", name: "Mary Meek", company: "Bark", amount: 20000, status: "Lead" },
  { id: "4", name: "Summer Ellis", company: "Boardly", amount: 30000, status: "Lead" },
  { id: "5", name: "Shri Ansari", company: "Mode", amount: 125000, status: "Qualified" },
  { id: "6", name: "Kim Saunders", company: "Summly", amount: 30000, status: "Proposal" },
  { id: "7", name: "Mitch Cohn", company: "Sales Wizard", amount: 110000, status: "Proposal" },
  { id: "8", name: "Mike Men", company: "Frontier Tech", amount: 30000, status: "Negotiation" },
];

// =====================
// CARD
// =====================
function LeadCard({ lead }) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="card shadow-sm border-0 bg-white hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-grab mb-3"
    >
      <div className="card-body p-3">
        <p className="card-title mb-1 fw-bold text-dark" style={{fontSize: '0.85rem'}}>
          {lead.name}
        </p>
        <p className="text-muted mb-2" style={{fontSize: '0.75rem'}}>
          {lead.company}
        </p>
        <div className="d-flex align-items-center justify-content-between">
          <span className="text-primary fw-medium d-flex align-items-center gap-1" style={{fontSize: '0.75rem'}}>
            <IndianRupee className="h-3 w-3" />
            {lead.amount.toLocaleString()}
          </span>
          <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1" style={{fontSize: '0.65rem'}}>
            {lead.status}
          </span>
        </div>
      </div>
    </div>
  );
}

// =====================
// COLUMN
// =====================
function Column({ status, leads, bgClass, icon }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Lead':
        return (
          <svg width="24" height="24" fill="#3b82f6" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(59,130,246,0.3))'}}>
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
          </svg>
        );
      case 'Qualified':
        return (
          <svg width="24" height="24" fill="#10b981" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(16,185,129,0.3))'}}>
            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
          </svg>
        );
      case 'Proposal':
        return (
          <svg width="24" height="24" fill="#f59e0b" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))'}}>
            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
          </svg>
        );
      case 'Negotiation':
        return (
          <svg width="24" height="24" fill="#8b5cf6" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(139,92,246,0.3))'}}>
            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
          </svg>
        );
      case 'Converted':
        return (
          <svg width="24" height="24" fill="#059669" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(5,150,105,0.3))'}}>
            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
          </svg>
        );
      case 'Closed':
        return (
          <svg width="24" height="24" fill="#dc2626" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(220,38,38,0.3))'}}>
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 1 1 .708.708L8.707 8l5.147 5.146a.5.5 0 1 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 1 1-.708-.708L7.293 8 2.146 2.854Z"/>
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" fill="#6b7280" viewBox="0 0 16 16" style={{filter: 'drop-shadow(0 2px 4px rgba(107,114,128,0.3))'}}>
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
          </svg>
        );
    }
  };

  return (
    <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 mb-4">
      <div className="card shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-300 h-100 position-relative overflow-hidden">
        {/* Decorative background element */}
        <div className={`position-absolute top-0 end-0 opacity-10 ${bgClass} rounded-circle`} style={{width: '100px', height: '100px', marginTop: '-30px', marginRight: '-30px'}}></div>

        <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between py-3">
          <div className="d-flex align-items-center gap-2">
            {getStatusIcon(status)}
            <h6 className="card-title mb-0 fw-bold text-dark">{status}</h6>
          </div>
          <span className="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 fw-bold">
            {leads.length}
          </span>
        </div>

        <div className="card-body p-3" style={{maxHeight: '400px', overflowY: 'auto'}}>
          <SortableContext
            items={leads.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.length > 0 ? (
              leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} />
              ))
            ) : (
              <div className="text-center text-muted py-4">
                <small>No leads</small>
              </div>
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

// =====================
// PAGE
// =====================
export default function Page() {
  const [data, setData] = useState(initialData);
  const [activeLead, setActiveLead] = useState(null);
  const [search, setSearch] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

  const findContainer = (id) =>
    data.find(l => l.id === id)?.status;

  const handleDragStart = (event) => {
    setActiveLead(data.find(l => l.id === event.active.id));
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveLead(null);
    if (!over) return;

    const fromStatus = findContainer(active.id);
    const toStatus = findContainer(over.id) || over.id;

    if (!fromStatus || !toStatus) return;

    if (fromStatus !== toStatus) {
      setData(prev =>
        prev.map(l =>
          l.id === active.id ? { ...l, status: toStatus } : l
        )
      );
    } else {
      const items = data.filter(l => l.status === fromStatus);
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);

      setData(prev => [
        ...prev.filter(l => l.status !== fromStatus),
        ...reordered,
      ]);
    }
  };

  const statusConfigs = [
    { status: "Lead", bgClass: "bg-gradient-to-r from-blue-500 to-blue-600" },
    { status: "Qualified", bgClass: "bg-gradient-to-r from-green-500 to-green-600" },
    { status: "Proposal", bgClass: "bg-gradient-to-r from-yellow-500 to-yellow-600" },
    { status: "Negotiation", bgClass: "bg-gradient-to-r from-purple-500 to-purple-600" },
    { status: "Converted", bgClass: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
    { status: "Closed", bgClass: "bg-gradient-to-r from-red-500 to-red-600" },
  ];

  return (
    <div className="min-h-screen bg-light">
      <div className="container-fluid px-4 py-4">

        {/* HEADER */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 fw-bold text-dark mb-0">
            CRM Board
          </h1>

          <div className="position-relative" style={{width: '300px'}}>
            <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 h-4 w-4 text-muted" />
            <input
              className="form-control ps-5 rounded-pill border-0 shadow-sm"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{backgroundColor: '#f8f9fa'}}
            />
          </div>
        </div>

        {/* BOARD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="row">
            {statusConfigs.map(config => (
              <Column
                key={config.status}
                status={config.status}
                bgClass={config.bgClass}
                leads={data.filter(
                  l =>
                    l.status === config.status &&
                    (l.name.toLowerCase().includes(search.toLowerCase()) ||
                      l.company.toLowerCase().includes(search.toLowerCase()))
                )}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && <LeadCard lead={activeLead} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
