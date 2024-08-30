'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { Matchup, Roster, SleeperService, User } from '@/services/sleeper-service'
import { Card, CardContent, Typography, Avatar, CircularProgress } from '@mui/material'
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied'

export default function Loser() {

    const [weekLoser, setWeekLoser] = useState<string | null>(null)
    const [loser, setLoser] = useState<Matchup>()
    const [users, setUsers] = useState<User[]>([])
    const [rosters, setRosters] = useState<Roster[]>([])
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loserUser, setLoserUser] = useState<Partial<User> | null>(null)

    useEffect(() => {
        const sleeperService = new SleeperService()

        Promise.all([
            sleeperService.getMatchups(),
            sleeperService.getUsersInLeague(),
            sleeperService.getRostersForUsers()
        ]).then(([matchupsData, usersData, rostersData]) => {
            setMatchups(matchupsData)
            setUsers(usersData)
            setRosters(rostersData)
        })
    }, [])

    useEffect(() => {
        if (matchups.length > 0) {
            const weekLoser = calculateLoser(matchups)
            setLoser(weekLoser)
        }
    }, [matchups])

    useEffect(() => {
        if (loser && rosters.length > 0) {
            matchUserToLoser(rosters)
        }
    }, [loser, rosters])

    useEffect(() => {
        if (weekLoser) {
            const sleeperService = new SleeperService()
            sleeperService.getUserByID(weekLoser)
                .then((user: Partial<User>) => setLoserUser(user))
                .catch((error: any) => console.error('Error fetching loser user:', error))
        }
    }, [weekLoser])

    const calculateLoser = (matchups: Matchup[]) => {
        let lowestPoints = 0;
        let weekLow: any;
        matchups.forEach(matchup => {
            if (matchup.points < 1) {
                lowestPoints = matchup.points
                weekLow = matchup
            }
        });
        return weekLow;
    }

    const matchUserToLoser = (rosters: Roster[]) => {
        if (!loser) return;
        rosters.forEach(roster => {
            if (roster.roster_id === Number(loser.roster_id)) {
                console.log(roster);
                setWeekLoser(roster.owner_id);
            }
        })
    }

    console.log(loserUser)

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <CardContent>
                    <Typography variant="h4" component="h1" gutterBottom className={styles.title}>
                        Lowest Scoring Team of The Week
                    </Typography>
                    {loserUser ? (
                        <div className={styles.loserInfo}>
                            <Avatar
                                src={loserUser.avatar || undefined}
                                alt={loserUser.display_name || loserUser.username}
                                className={styles.avatar}
                            />
                            <Typography variant="h5" component="p" className={styles.loserName}>
                                {loserUser.display_name || loserUser.username}
                            </Typography>
                        </div>
                    ) : (
                        <CircularProgress className={styles.loader} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}