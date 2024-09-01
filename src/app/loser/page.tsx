'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { Matchup, Roster, SleeperService, User } from '@/services/sleeper-service'
import { Card, CardContent, Typography, Avatar, CircularProgress } from '@mui/material'
import { Wheel } from 'react-custom-roulette'
import { useInterval } from '@/utils/useInterval'


export default function Loser() {

    const [weekLoser, setWeekLoser] = useState<string | null>(null)
    const [loser, setLoser] = useState<Matchup>()
    const [users, setUsers] = useState<User[]>([])
    const [rosters, setRosters] = useState<Roster[]>([])
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loserUser, setLoserUser] = useState<Partial<User> | null>(null)
    const [mustSpin, setMustSpin] = useState(false)
    const [prizeNumber, setPrizeNumber] = useState(0)

    const wheelOptions = [
        { option: 'No Phone for day' },
        { option: 'Chelada shotgun' },
        { option: 'Murph' },
        { option: 'Option 4' },
        { option: 'Option 5' },
        { option: 'Option 6' },
        { option: 'Option 3' },
        { option: 'Option 4' },
        { option: 'Option 5' },
        { option: 'Option 6' },
    ]

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

    useInterval(() => {
        const now = new Date()
        if (now.getDay() === 2 && now.getHours() === 20 && now.getMinutes() === 0) {
            spinWheel()
        }
    }, 10000) // Check every 10 seconds

    const spinWheel = () => {
        const newPrizeNumber = Math.floor(Math.random() * wheelOptions.length)
        setPrizeNumber(newPrizeNumber)
        setMustSpin(true)
    }

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

    return (
        <div className={styles.body}>
            <Typography variant="h4" component="h1" gutterBottom className={styles.header}>
                Wheel spin Tuesday's at 8pm EST.
            </Typography>
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
                <div className={styles.wheelWrapper}>
                    <Typography variant="h4" component="h2" gutterBottom className={styles.title}>
                        Wheel of Punishment
                    </Typography>
                    <div className={styles.wheelContainer}>
                        <Wheel
                            mustStartSpinning={mustSpin}
                            prizeNumber={prizeNumber}
                            data={wheelOptions}
                            backgroundColors={['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3', '#F3FF33']}
                            onStopSpinning={() => {
                                setMustSpin(false)
                                console.log("Wheel stopped on:", wheelOptions[prizeNumber].option)
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}