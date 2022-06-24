import React from 'react';
import styles from "./Navbar.module.css";

export const SiteHorizontalNavigation = () => {
  return (
    <nav className={styles.nav}>
      <ul className={styles.navUl}>
        <li>
          <a href="#">Home</a>
        </li>
        <li>
          <a href="#">About</a>
        </li>
      </ul>
    </nav>
  );
};
