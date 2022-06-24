import React from 'react';
import { Header } from './Header';
import styles from "./Navbar.module.css";
import { SiteHorizontalNavigation } from './SiteHorizontalNavigation';

export const Navbar: React.FC = () => {
  return (
    <div className={styles.topbar}>
      <Header />
      <SiteHorizontalNavigation />
    </div>
  );
};



