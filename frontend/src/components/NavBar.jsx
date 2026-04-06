import React from 'react'
import { Link } from 'react-router-dom'

export default function NavBar({ me, onLogout }) {
  const role = me.role
  const rolePath = `/${role.toLowerCase()}`
  return (
    <div className="navbar navbar--dash">
      <div className="navbar__left">
        <div className="brand">AI-CSGTS</div>
        <Link to={rolePath} className="navbar__link">
          Dashboard
        </Link>
      </div>
      <div className="navbar__right">
        <span className="navbar__user">{me.name}</span>
        <button className="btn btn--ghost" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}

