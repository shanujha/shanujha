import React from 'react';
import styles from "./Footer.module.css";

export const Footer = () => {
  return (
    <div className={styles.baseBoxFlex}>
      <span>&copy; Shanu Jha</span>
      <a href="https://shanujha.github.io">Website</a>
      <a href="tel:+919594325456">Call me</a>
    </div>
  );
};
