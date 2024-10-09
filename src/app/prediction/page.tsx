"use client";

import React, { useState, useEffect } from "react";
import {
  SleeperService,
  User,
  Roster,
  LeagueSchedule,
  ScheduleMatchup,
  Matchup,
  League,
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
  division: number;
}

const PredictionPage: React.FC = () => {
  const [predictions, setPredictions] = useState<TeamPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const sleeperService = new SleeperService();
      const { users, rosters, matchups, league } =
        await sleeperService.getAllLeagueData();
      const teamPredictions = calculatePredictions(
        users,
        rosters,
        matchups,
        league
      );
      setPredictions(teamPredictions);
      setLoading(false);
    };

    fetchData();
  }, []);

  const calculatePredictions = (
    users: User[],
    rosters: Roster[],
    matchups: Matchup[][],
    league: League
  ): TeamPrediction[] => {
    const totalTeams = users.length;
    const divisions = league.settings.divisions;
    const teamsPerDivision = totalTeams / divisions;
    const playoffSpotsPerDivision = 3;
    const currentWeek = new SleeperService().getCurrentNFLWeek();

    const teamStrengths = calculateTeamStrengths(rosters, matchups);
    const maxStrength = Math.max(...Object.values(teamStrengths));

    const teamPredictions = users.map((user, index) => {
      const roster = rosters.find((r) => r.owner_id === user.user_id);
      if (!roster)
        return {
          name: user.display_name,
          playoffChance: 0,
          superBowlChance: 0,
          division: Math.floor(index / teamsPerDivision) + 1,
        };

      const remainingGames = 17 - currentWeek + 1;
      const gamesPlayed = currentWeek - 1;
      const currentWinPercentage = roster.settings.wins / gamesPlayed;

      const relativeStrength = teamStrengths[roster.roster_id] / maxStrength;
      const projectedWinPercentage =
        (currentWinPercentage + relativeStrength) / 2;

      const projectedWins = projectedWinPercentage * remainingGames;
      const totalProjectedWins = roster.settings.wins + projectedWins;
      const totalGames = 17;

      const finalProjectedWinPercentage = totalProjectedWins / totalGames;

      return {
        name: user.display_name,
        projectedWins: totalProjectedWins,
        strength: relativeStrength,
        division: Math.floor(index / teamsPerDivision) + 1,
        finalProjectedWinPercentage,
      };
    });

    // Calculate playoff chances based on division rankings
    const divisionRankings = calculateDivisionRankings(teamPredictions);

    return teamPredictions
      .map((team) => {
        const divisionRank =
          divisionRankings[team.division].findIndex(
            (t) => t.name === team.name
          ) + 1;

        // Calculate playoff chance based on division rank
        let playoffChance;
        if (divisionRank <= playoffSpotsPerDivision) {
          playoffChance = 100 - (divisionRank - 1) * 10; // 100% for 1st, 90% for 2nd, 80% for 3rd
        } else {
          playoffChance = Math.max(
            0,
            70 - (divisionRank - playoffSpotsPerDivision) * 20
          ); // Decreasing chances for lower ranks
        }

        // Adjust playoff chance based on projected win percentage
        if (team.finalProjectedWinPercentage !== undefined) {
          playoffChance *= team.finalProjectedWinPercentage;
        }
        const superBowlChance =
          team.strength !== undefined
            ? (playoffChance * team.strength ** 2) / divisions
            : 0;

        return {
          name: team.name,
          playoffChance: Number(playoffChance.toFixed(2)),
          superBowlChance: Number(superBowlChance.toFixed(2)),
          division: team.division,
        };
      })
      .sort((a, b) => b.playoffChance - a.playoffChance);
  };

  const calculateDivisionRankings = (
    teams: any[]
  ): { [division: number]: any[] } => {
    const divisions: { [division: number]: any[] } = {};
    teams.forEach((team) => {
      if (!divisions[team.division]) divisions[team.division] = [];
      divisions[team.division].push(team);
    });

    Object.keys(divisions).forEach((division) => {
      divisions[Number(division)].sort(
        (a, b) => b.projectedWins - a.projectedWins
      );
    });

    return divisions;
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
          backgroundColor: "rgba(187, 134, 252, 0.6)",
          borderColor: "rgba(187, 134, 252, 1)",
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
          labels: {
            color: "#e0e0e0",
          },
        },
        title: {
          display: true,
          text: title,
          color: "#e0e0e0",
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "Chance (%)",
            color: "#e0e0e0",
          },
          ticks: {
            color: "#e0e0e0",
          },
        },
        y: {
          ticks: {
            color: "#e0e0e0",
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
      <h1 className={styles.title}>Team Projections</h1>
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
