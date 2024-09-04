export class RandomService {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = process.env.API_URL || 'http://localhost:3333';
    }

    getRandomNumber = async (): Promise<number> => {
        const response = await fetch(`${this.baseUrl}/number`);
        const data = await response.json();
        return data.value;
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