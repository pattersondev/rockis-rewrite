'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'
import { Matchup, Roster, SleeperService, User } from '@/services/sleeper-service'
import { Card, CardContent, Typography, Avatar, CircularProgress } from '@mui/material'
import { useInterval } from '@/utils/useInterval'
import dynamic from 'next/dynamic'
import { RandomService } from '@/services/random-service'

// Dynamically import the Wheel component with SSR disabled
const Wheel = dynamic(
    () => import('react-custom-roulette').then((mod) => mod.Wheel),
    { ssr: false }
)

export default function Loser() {

    const [weekLoser, setWeekLoser] = useState<string | null>(null)
    const [loser, setLoser] = useState<Matchup>()
    const [users, setUsers] = useState<User[]>([])
    const [rosters, setRosters] = useState<Roster[]>([])
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loserUser, setLoserUser] = useState<Partial<User> | null>(null)
    const [mustSpin, setMustSpin] = useState(false)
    const [prizeNumber, setPrizeNumber] = useState(0)
    const [punishment, setPunishment] = useState<any | null>(null)
    const [hasSpun, setHasSpun] = useState(false)
    const spinWheelRef = useRef<() => void>();

    const wheelOptions = [
        { option: 'No Phone for day' },
        { option: 'Chelada shotgun' },
        { option: 'Murph' },
        { option: '5k' },
        { option: 'Free Spot' },
        { option: 'High Scorer Glaze' },
        { option: 'Muncy Snap Streak' },
        { option: 'Bootlegger' },
        { option: 'TikTok Dance' },
    ]

    useEffect(() => {
        const sleeperService = new SleeperService()
        const randomService = new RandomService()
        Promise.all([
            sleeperService.getMatchups(),
            sleeperService.getUsersInLeague(),
            sleeperService.getRostersForUsers(),
            randomService.getRandomNumber()
        ]).then(([matchupsData, usersData, rostersData, randomNumber]) => {
            setMatchups(matchupsData)
            setUsers(usersData)
            setRosters(rostersData)
            setPunishment(wheelOptions[randomNumber].option)
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

    useEffect(() => {
        spinWheelRef.current = () => {
            const randomService = new RandomService()
            if (hasSpun) return;
            randomService.getRandomNumber().then((number: number) => {
                console.log("Random number:", number);
                setPrizeNumber(number)
                setMustSpin(true)
                setHasSpun(true)
            })
        }
    }, [hasSpun])

    useInterval(() => {
        const now = new Date()
        if (now.getDay() === 2 && now.getHours() === 19 && now.getMinutes() === 59) {
            const randomService = new RandomService();
            randomService.setRandomNumber(Math.floor(Math.random() * wheelOptions.length));
            console.log("Random number set:", Math.floor(Math.random() * wheelOptions.length));
        }
    }, 10000)

    useInterval(() => {
        const now = new Date()
        if (now.getDay() === 2 && now.getHours() === 20 && now.getMinutes() === 0) {
            spinWheelRef.current?.()
        }
    }, 10000)

    const spinWheel = () => {
        spinWheelRef.current?.()
    }

    const calculateLoser = (matchups: Matchup[]) => {
        let lowestPoints = 1000;
        let weekLow: any;
        matchups.forEach(matchup => {
            console.log(matchup)
            if (matchup.points <= lowestPoints) {
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
                        Wheel of Squeal
                    </Typography>
                    <div className={styles.wheelContainer}>
                        {typeof window !== 'undefined' && (
                            <Wheel
                                mustStartSpinning={mustSpin}
                                prizeNumber={prizeNumber}
                                data={wheelOptions}
                                backgroundColors={['#4ecdc4', '#45b7d1', '#ff6b6b', '#f7fff7']}
                                onStopSpinning={() => {
                                    setMustSpin(false)
                                    setPunishment(wheelOptions[prizeNumber]?.option)
                                }}
                            />
                        )}
                        {punishment && (
                            <Typography variant="h5" component="p" className={styles.punishment}>
                                {punishment}
                            </Typography>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}