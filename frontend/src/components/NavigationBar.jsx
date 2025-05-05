import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavigationBar.css';

export default function NavigationBar({ onButtonClick }) {
    return (
        <nav className="navigation-bar">
            <ul className="nav-list">
                <li>
                    <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                        Головна
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/heroes" className={({ isActive }) => isActive ? 'active' : ''}>
                        Герої
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/players" className={({ isActive }) => isActive ? 'active' : ''}>
                        Гравці
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/matches" className={({ isActive }) => isActive ? 'active' : ''}>
                        Матчі
                    </NavLink>
                </li>
            </ul>
        </nav>
    );
}
