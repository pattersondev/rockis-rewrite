'use client'

import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@mui/material";

export default function Home() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const targetDate = new Date("2024-09-07T23:59:00");
    const difference = +targetDate - +new Date();

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return null;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  return (
    <main className={styles.main}>
      <div className={`${styles.countdownBanner} ${styles.largerCountdown}`}>
        {timeLeft ? (
          <span>
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        ) : (
          <span>Time's up!</span>
        )}
      </div>
      <div className={styles.imageContainer}>
        <Image
          src='/rhabib.jpg'
          alt="Rhabib"
          width={300}
          height={300}
          layout="responsive"
        />
      </div>
      <div className={styles.buttonContainer}>
        <Link href="/loser">
          <Button variant="contained" color="primary" className={styles.button}>
            See this week's fantasy loser
          </Button>
        </Link>
      </div>
    </main>
  );
}
