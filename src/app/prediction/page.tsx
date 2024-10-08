"use client";

import React, { useState, useEffect } from "react";
import {
  SleeperService,
  User,
  Roster,
  LeagueSchedule,
  ScheduleMatchup,
  Matchup,
} from "@/services/sleeper-service";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import styles from "./page.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TeamPrediction {
  name: string;
  playoffChance: number;
  superBowlChance: number;
}

const PredictionPage: React.FC = () => {
  const [predictions, setPredictions] = useState<TeamPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const sleeperService = new SleeperService();
      const { users, rosters, matchups } =
        await sleeperService.getAllLeagueData();
      const teamPredictions = calculatePredictions(users, rosters, matchups);
      setPredictions(teamPredictions);
      setLoading(false);
    };

    fetchData();
  }, []);

  const calculatePredictions = (
    users: User[],
    rosters: Roster[],
    matchups: Matchup[][]
  ): TeamPrediction[] => {
    const totalTeams = users.length;
    const playoffSpots = Math.floor(totalTeams / 2);
    const currentWeek = new SleeperService().getCurrentNFLWeek();

    const teamStrengths = calculateTeamStrengths(rosters, matchups);
    const maxStrength = Math.max(...Object.values(teamStrengths));

    return users
      .map((user) => {
        const roster = rosters.find((r) => r.owner_id === user.user_id);
        if (!roster)
          return {
            name: user.display_name,
            playoffChance: 0,
            superBowlChance: 0,
          };

        const remainingGames = 17 - currentWeek + 1; // Assuming a 17-week season
        const gamesPlayed = currentWeek - 1;
        const currentWinPercentage = roster.settings.wins / gamesPlayed;

        const relativeStrength = teamStrengths[roster.roster_id] / maxStrength;
        const projectedWinPercentage =
          (currentWinPercentage + relativeStrength) / 2;

        const projectedWins = projectedWinPercentage * remainingGames;
        const totalProjectedWins = roster.settings.wins + projectedWins;
        const totalGames = 17; // Total games in a season

        const finalProjectedWinPercentage = totalProjectedWins / totalGames;

        // Adjust playoff chance based on current standing and projected finish
        const playoffChance = Math.min(
          finalProjectedWinPercentage ** 2 * (playoffSpots / totalTeams) * 100,
          100
        );

        // Further reduce Super Bowl chances for underperforming teams
        const superBowlChance =
          (playoffChance / 100) * relativeStrength ** 2 * (100 / playoffSpots);

        return {
          name: user.display_name,
          playoffChance: Number(playoffChance.toFixed(2)),
          superBowlChance: Number(superBowlChance.toFixed(2)),
        };
      })
      .sort((a, b) => b.playoffChance - a.playoffChance);
  };

  const calculateTeamStrengths = (
    rosters: Roster[],
    matchups: Matchup[][]
  ): { [rosterId: number]: number } => {
    const strengths: { [rosterId: number]: number } = {};
    rosters.forEach((roster) => {
      const totalPoints = matchups.reduce((sum, weekMatchups) => {
        const match = weekMatchups.find(
          (m) => m.roster_id === roster.roster_id
        );
        return sum + (match ? match.points : 0);
      }, 0);
      const gamesPlayed =
        roster.settings.wins + roster.settings.losses + roster.settings.ties;
      strengths[roster.roster_id] = totalPoints / gamesPlayed;
    });
    return strengths;
  };

  const projectRemainingWins = (
    roster: Roster,
    teamStrengths: { [rosterId: number]: number },
    remainingGames: number
  ): number => {
    const ownStrength = teamStrengths[roster.roster_id];
    const averageOpponentStrength =
      Object.values(teamStrengths).reduce(
        (sum, strength) => sum + strength,
        0
      ) / Object.keys(teamStrengths).length;
    const winProbability =
      ownStrength / (ownStrength + averageOpponentStrength);
    return winProbability * remainingGames;
  };

  const renderBarChart = (data: number[], labels: string[], title: string) => {
    const chartData = {
      labels,
      datasets: [
        {
          label: title,
          data,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };

    const options = {
      indexAxis: "y" as const,
      elements: {
        bar: {
          borderWidth: 2,
        },
      },
      responsive: true,
      plugins: {
        legend: {
          position: "top" as const,
        },
        title: {
          display: true,
          text: title,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "Chance (%)",
          },
        },
      },
    };

    return <Bar data={chartData} options={options} />;
  };

  if (loading) {
    return <div className={styles.loading}>Loading predictions...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Team Predictions</h1>
      <div className={styles.chartsContainer}>
        <div className={styles.chartWrapper}>
          {renderBarChart(
            predictions.map((p) => p.playoffChance),
            predictions.map((p) => p.name),
            "Playoff Chances"
          )}
        </div>
        <div className={styles.chartWrapper}>
          {renderBarChart(
            predictions.map((p) => p.superBowlChance),
            predictions.map((p) => p.name),
            "Super Bowl Chances"
          )}
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.predictionTable}>
          <thead>
            <tr>
              <th>Team</th>
              <th>Playoff Chance</th>
              <th>Super Bowl Chance</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => (
              <tr key={prediction.name}>
                <td>{prediction.name}</td>
                <td>{prediction.playoffChance}%</td>
                <td>{prediction.superBowlChance}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionPage;
