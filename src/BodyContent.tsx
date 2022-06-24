import React from 'react';
import styles from './App.module.css';

export const BodyContent = () => {
  return (
    <div className={styles.contentBoxHorizontal}>
      <BigText text='👨‍💻 '></BigText>
      <p>
        I'm a software engineer.
        <br />
        I'd love to show you what I can make.
        <br />
        Join me in this journey to build out my portfolio
      </p>
    </div>
  );
};

interface IBigText {
  text: string;
}

const BigText: React.FC<IBigText> = ({ text }) => {
  return <div className={styles.bigText}>{text}</div>
}