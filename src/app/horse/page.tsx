"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SleeperService,
  User,
  Roster,
  Matchup,
  League,
} from "@/services/sleeper-service";
import styles from "./page.module.css";

interface TeamData {
  name: string;
  wins: number;
  emoji: string;
}

const HorseRacePage: React.FC = () => {
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const sleeperService = new SleeperService();
      const { users, rosters, league } =
        await sleeperService.getAllLeagueData();
      const teamData = calculateTeamData(users, rosters, league);
      setTeamsData(teamData);
      setCurrentWeek(sleeperService.getCurrentNFLWeek());
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: width * 0.5 });
      }
    };

    window.addEventListener("resize", updateDimensions);
    updateDimensions();

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const calculateTeamData = (
    users: User[],
    rosters: Roster[],
    league: League
  ): TeamData[] => {
    const emojis: { [key: string]: string } = {
      rockthomas: "🪨",
      nahum091: "🐝",
      anthmead: "🧀",
      jakemayer4: "🔨",
      schpat: "🍞",
      charliepilc: "🔫",
      cameronburrows: "🍆",
      yostie15: "👨‍🦰",
      cmcginley: "🐱",
      grantamos: "🧜",
      quabnuunu: "💃", // Changed to dancing emoji
      jackcameron: "🏳️‍⚧️",
      // Add a default emoji for any remaining teams
      default: "🏃",
    };

    return users
      .map((user) => {
        const roster = rosters.find((r) => r.owner_id === user.user_id);
        return {
          name: user.display_name,
          wins: roster ? roster.settings.wins : 0,
          emoji: emojis[user.display_name.toLowerCase()] || emojis.default,
        };
      })
      .sort((a, b) => b.wins - a.wins);
  };

  const renderHorseRace = () => {
    const { width: trackWidth, height: trackHeight } = dimensions;
    const laneHeight = trackHeight / teamsData.length;
    const finishLine = trackWidth - trackWidth * 0.1;
    const totalSeasonWeeks = 17;
    const emojiSize = Math.min(laneHeight * 0.8, trackWidth * 0.05);

    // Adjust this factor to move emojis closer to the Super Bowl
    const progressionFactor = 1.5;

    return (
      <>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${trackWidth} ${trackHeight}`}
          className={styles.raceTrack}
        >
          {/* Finish line */}
          <line
            x1={finishLine}
            y1={0}
            x2={finishLine}
            y2={trackHeight}
            stroke="black"
            strokeWidth="2"
          />

          {/* Vertical "Super Bowl" text */}
          <text
            x={finishLine + 10}
            y={0}
            fontSize={trackWidth * 0.076}
            textAnchor="start"
            fill="rgba(0, 0, 0, 0.5)"
            transform={`rotate(90 ${finishLine + 10} 0)`}
          >
            SUPER BOWL
          </text>

          {/* Race lanes and emojis */}
          {teamsData.map((team, index) => {
            const yPosition = index * laneHeight + laneHeight / 2;

            // Calculate the x-position based on wins and current week
            const progressPercentage =
              (team.wins / totalSeasonWeeks) * progressionFactor;
            const xPosition = Math.min(
              progressPercentage * finishLine,
              finishLine - emojiSize
            );

            return (
              <g key={team.name}>
                {/* Lane separator */}
                <line
                  x1={0}
                  y1={(index + 1) * laneHeight}
                  x2={trackWidth}
                  y2={(index + 1) * laneHeight}
                  stroke="#ddd"
                  strokeWidth="1"
                />
                {/* Team name */}
                <text
                  x={5}
                  y={yPosition}
                  dominantBaseline="middle"
                  fontSize={trackWidth * 0.015}
                  fill="#333"
                >
                  {team.name}
                </text>
                {/* Emoji */}
                <text
                  x={xPosition}
                  y={yPosition}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize={emojiSize}
                >
                  {team.emoji}
                </text>
              </g>
            );
          })}
        </svg>
      </>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading horse race...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Horse Race</h1>
      <div className={styles.weekIndicator}>Week {currentWeek}</div>
      <div ref={containerRef} className={styles.raceContainer}>
        {renderHorseRace()}
      </div>
    </div>
  );
};

export default HorseRacePage;
