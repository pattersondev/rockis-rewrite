export class RandomService {
    private readonly baseUrl: string;

    constructor() {
        // Use HTTPS and the direct IP address
        this.baseUrl = 'https://rockis-backend.onrender.com';
        console.log('RandomService baseUrl:', this.baseUrl);
    }

    getRandomNumber = async (): Promise<number> => {
        try {
            const response = await fetch(`${this.baseUrl}/number`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.value;
        } catch (error) {
            console.error('Error fetching random number:', error);
            return Math.floor(Math.random() * 9);
        }
    }

    setRandomNumber = async (number: number): Promise<void> => {
        try {
            const response = await fetch(`${this.baseUrl}/number`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: number }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error setting random number:', error);
        }
    }
}