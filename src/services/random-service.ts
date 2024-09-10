export class RandomService {
    private readonly baseUrl: string;

    constructor() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://138.88.10.70:3333';
        this.baseUrl = new URL(apiUrl).origin;
        console.log('RandomService baseUrl:', this.baseUrl);
    }

    getRandomNumber = async (): Promise<number> => {
        try {
            const response = await fetch(`${this.baseUrl}/number`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.number;
        } catch (error) {
            console.error('Error fetching random number:', error);
            return Math.floor(Math.random() * 9);
        }
    }

    setRandomNumber = async (number: number): Promise<void> => {
        await fetch(`${this.baseUrl}/number`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: number }),
        });
    }
}