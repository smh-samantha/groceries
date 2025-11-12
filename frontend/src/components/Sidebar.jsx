import { useState } from 'react';
import mealIcon from '../assets/icon-meal.svg';
import rotationIcon from '../assets/icon-rotation.svg';
import groceryIcon from '../assets/icon-grocery.svg';

const navItems = [
  { key: 'meals', label: 'Meal Bank', icon: mealIcon },
  { key: 'rotation', label: 'Rotation', icon: rotationIcon },
  { key: 'groceries', label: 'Groceries', icon: groceryIcon },
];

const Sidebar = ({
  active,
  onSelect,
  username,
  onLogout,
  mobileOpen,
  onToggleMobile,
  isMobile,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-header">
          <h2>MAVIS MEALS</h2>
        </div>
        <button
          type="button"
          className="ghost collapse-toggle"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => {
            if (isMobile) {
              onToggleMobile();
            } else {
              setCollapsed((prev) => !prev);
            }
          }}
        >
          {isMobile ? 'Close menu' : collapsed ? '❯' : '❮'}
        </button>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === active ? 'active' : ''}
              onClick={() => onSelect(item.key)}
            >
              <span className="nav-icon">
                <img src={item.icon} alt="" aria-hidden="true" />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="sidebar-footer">
        <p className="muted">{collapsed ? username : `Logged in as ${username}`}</p>
        <button className="ghost" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
