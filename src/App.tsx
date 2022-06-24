import React from 'react'
import { BodyContent } from './BodyContent';
import { Footer } from './Footer';
import { Navbar } from './shared/shared-header/Navbar';
import styles from "./App.module.css"
const App = () => {
  return (
    <>
      <Navbar />
      <div className={styles.main}>
        <BodyContent />
      </div>
      <Footer />
    </>
  )
}

export default App;


