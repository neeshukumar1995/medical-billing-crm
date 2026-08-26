'use client'

import React from 'react'
import styles from './StatCard.module.css'

const IconArrow = React.memo(() => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
))

IconArrow.displayName = 'IconArrow'

const StatCard = React.memo(({ 
  title, 
  value, 
  bg, 
  glowColor, 
  iconBg, 
  badgeBg, 
  badgeColor, 
  dotColor, 
  badgeLabel, 
  icon, 
  onClick 
}) => (
  <div
    onClick={onClick}
    className={styles.statCard}
    style={{ background: bg }}
  >
    {/* Glow Orb */}
    <div 
      className={styles.glowOrb}
      style={{ background: glowColor }}
    />

    {/* Icon */}
    <div 
      className={styles.iconContainer}
      style={{ background: iconBg }}
    >
      {icon}
    </div>

    {/* Label */}
    <div className={styles.label}>
      {title}
    </div>

    {/* Value */}
    <div className={styles.value}>
      {(value ?? 0).toLocaleString()}
    </div>

    {/* Footer */}
    <div className={styles.footer}>
      <span 
        className={styles.badge}
        style={{ background: badgeBg, color: badgeColor }}
      >
        <span 
          className={styles.dot}
          style={{ background: dotColor }}
        />
        {badgeLabel}
      </span>
      <div className={styles.arrowContainer}>
        <IconArrow />
      </div>
    </div>
  </div>
))

StatCard.displayName = 'StatCard'

export default StatCard
