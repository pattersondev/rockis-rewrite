export interface Matchup {
    starters: string[];
    roster_id: number;
    players: string[];
    matchup_id: number;
    points: number;
    custom_points: number | null;
}

export interface User {
    user_id: string;
    username: string;
    display_name: string;
    avatar: string;
    metadata: {
        team_name: string;
    };
    is_owner: boolean;
}

export interface Roster {
    starters: string[];
    settings: {
        wins: number;
        waiver_position: number;
        waiver_budget_used: number;
        total_moves: number;
        ties: number;
        losses: number;
        fpts_decimal: number;
        fpts_against_decimal: number;
        fpts_against: number;
        fpts: number;
    };
    roster_id: number;
    reserve: string[];
    players: string[];
    owner_id: string;
    league_id: string;
}

export interface ScheduleMatchup {
    roster_id: number;
    opponent_id: number;
    week: number;
}

export interface LeagueSchedule {
    [week: string]: ScheduleMatchup[];
}

export interface League {
    total_rosters: number;
    status: string;
    sport: string;
    settings: {
        divisions: number;
        // ... other settings
    };
    // ... other properties
}

export class SleeperService {
    private readonly baseUrl = 'https://api.sleeper.app/v1';
    private readonly leagueId: string = '1050653620783505408';

    getMatchups = async (): Promise<Matchup[]> => {
        const response = await fetch(`${this.baseUrl}/league/${this.leagueId}/matchups/${this.getCurrentNFLWeek()}`);
        const data = await response.json();
        return data;
    }

    getCurrentNFLWeek(): number {
        const currentDate = new Date();
        const seasonStartDate = new Date(currentDate.getFullYear(), 8, 3); // September 3rd of the current year

        // Adjust start date to the most recent Tuesday
        seasonStartDate.setDate(seasonStartDate.getDate() + (2 - seasonStartDate.getDay() + 7) % 7);

        const timeDiff = currentDate.getTime() - seasonStartDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const currentWeek = Math.floor(daysDiff / 7) + 1;

        return Math.max(currentWeek, 1); // Ensure the week is at least 1
    }

    getUsersInLeague = async (): Promise<User[]> => {
        const response = await fetch(`${this.baseUrl}/league/${this.leagueId}/users`);
        const data = await response.json();
        return data;
    }

    getRostersForUsers = async (): Promise<Roster[]> => {
        const response = await fetch(`${this.baseUrl}/league/${this.leagueId}/rosters`);
        const data = await response.json();
        return data;
    }

    getUserByID = async (userID: string): Promise<Partial<User>> => {
        const response = await fetch(`${this.baseUrl}/user/${userID}`);
        const data = await response.json();
        return data;
    }

    getLeagueSchedule = async (): Promise<LeagueSchedule> => {
        const response = await fetch(`${this.baseUrl}/league/${this.leagueId}/schedule`);
        const data = await response.json();
        return data;
    }

    getMatchupsForWeek = async (week: number): Promise<Matchup[]> => {
        const response = await fetch(`${this.baseUrl}/league/${this.leagueId}/matchups/${week}`);
        const data = await response.json();
        return data;
    }

    getLeagueInfo = async (): Promise<League> => {
        const response = await fetch(`${this.baseUrl}/league/${this.leagueId}`);
        const data = await response.json();
        return data;
    }

    getAllLeagueData = async (): Promise<{ users: User[], rosters: Roster[], matchups: Matchup[][], league: League }> => {
        const [users, rosters, league] = await Promise.all([
            this.getUsersInLeague(),
            this.getRostersForUsers(),
            this.getLeagueInfo()
        ]);
        const currentWeek = this.getCurrentNFLWeek();
        
        const matchupsPromises = Array.from({ length: currentWeek }, (_, i) => 
            this.getMatchupsForWeek(i + 1)
        );
        const matchups = await Promise.all(matchupsPromises);

        return { users, rosters, matchups, league };
    }
}