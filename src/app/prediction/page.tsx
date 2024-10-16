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
  perceivedStrength: number;
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
    const totalRegularSeasonWeeks = 14; // Set to 14 weeks for regular season

    const teamStrengths = calculateTeamStrengths(rosters, matchups);
    const maxStrength = Math.max(...Object.values(teamStrengths));
    const scheduleStrength = calculateScheduleStrength(
      rosters,
      matchups,
      currentWeek
    );

    const teamPredictions = users.map((user, index) => {
      const roster = rosters.find((r) => r.owner_id === user.user_id);
      if (!roster)
        return {
          name: user.display_name,
          playoffChance: 0,
          superBowlChance: 0,
          division: Math.floor(index / teamsPerDivision) + 1,
          perceivedStrength: 0,
        };

      const remainingGames = Math.max(
        0,
        totalRegularSeasonWeeks - currentWeek + 1
      );
      const gamesPlayed = Math.min(currentWeek - 1, totalRegularSeasonWeeks);
      const currentWins = roster.settings.wins;

      const projectedRemainingWins = projectRemainingWins(
        roster,
        teamStrengths,
        remainingGames
      );
      const totalProjectedWins = currentWins + projectedRemainingWins;
      const finalProjectedWinPercentage =
        totalProjectedWins / totalRegularSeasonWeeks;

      const relativeStrength = teamStrengths[roster.roster_id] / maxStrength;
      const relativeScheduleStrength =
        scheduleStrength[roster.roster_id] / maxStrength;

      return {
        name: user.display_name,
        projectedWins: totalProjectedWins,
        strength: relativeStrength,
        scheduleStrength: relativeScheduleStrength,
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
        playoffChance *= team.finalProjectedWinPercentage || 0;

        const superBowlChance =
          (playoffChance * (team.strength || 0) ** 2) / divisions;

        // Calculate Perceived Strength with updated weights
        const strengthFactor = (team.strength || 0) * 50;
        const scheduleFactor = (1 - (team.scheduleStrength || 0)) * 50;
        const perceivedStrength = parseFloat(
          (strengthFactor + scheduleFactor).toFixed(2)
        );

        return {
          name: team.name,
          playoffChance: Number(playoffChance.toFixed(2)),
          superBowlChance: Number(superBowlChance.toFixed(2)),
          division: team.division,
          perceivedStrength,
        };
      })
      .sort((a, b) => b.playoffChance - a.playoffChance); // Sort by playoffChance
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

  const calculateScheduleStrength = (
    rosters: Roster[],
    matchups: Matchup[][],
    currentWeek: number
  ): { [rosterId: number]: number } => {
    const strengths: { [rosterId: number]: number } = {};
    const teamStrengths = calculateTeamStrengths(rosters, matchups);

    rosters.forEach((roster) => {
      let totalOpponentStrength = 0;
      let opponentCount = 0;

      matchups.slice(currentWeek - 1).forEach((weekMatchups) => {
        const match = weekMatchups.find(
          (m) => m.roster_id === roster.roster_id
        );
        if (match) {
          const opponentId = weekMatchups.find(
            (m) =>
              m.matchup_id === match.matchup_id &&
              m.roster_id !== roster.roster_id
          )?.roster_id;
          if (opponentId && teamStrengths[opponentId]) {
            totalOpponentStrength += teamStrengths[opponentId];
            opponentCount++;
          }
        }
      });

      strengths[roster.roster_id] =
        opponentCount > 0 ? totalOpponentStrength / opponentCount : 0;
    });

    return strengths;
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
        <div className={styles.chartWrapper}>
          {renderBarChart(
            predictions.map((p) => p.perceivedStrength),
            predictions.map((p) => p.name),
            "Perceived Strength"
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
              <th>Perceived Strength</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction) => (
              <tr key={prediction.name}>
                <td>{prediction.name}</td>
                <td>{prediction.playoffChance.toFixed(2)}%</td>
                <td>{prediction.superBowlChance.toFixed(2)}%</td>
                <td>{prediction.perceivedStrength.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionPage;
