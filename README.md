# E-Facture Express

**E-Facture Express** is a lightweight, web-based invoicing platform designed to help Moroccan SMEs comply with the upcoming 2026 mandatory e-invoicing law (Article 145-IX). The platform streamlines invoice management, ensures legal compliance, and is optimized for rapid deployment in modern business environments.

## Features

- **Secure User Authentication:** Robust JWT-based authentication for user accounts.
- **Invoice Management:** Create, edit, and manage invoices with ease.
- **Bulk CSV Import:** Quickly import multiple invoices from CSV files.
- **Automatic PDF Generation:** Generate VAT-compliant invoice PDFs using QuestPDF.
- **File Storage:** Store invoice files securely via MinIO.
- **Dockerized Deployment:** All components (frontend, backend, storage) are containerized for fast and reliable setup.
- **DGI Integration Simulation:** Simulates "Send to DGI" functionality while awaiting the official Moroccan tax authority API.

## Roadmap

- **MVP (June 2025):**  
  - [x] Dockerized frontend and backend  
  - [x] JWT authentication  
  - [x] Invoice CRUD operations  
  - [x] CSV import  
  - [x] PDF generation and storage  
  - [x] Simulated DGI integration  
  - [ ] Production-ready CI/CD  
  - [ ] Official DGI API integration

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/efacture-express.git
   cd efacture-express
   ```

2. **Configure environment variables:**  
   Copy `.env.example` to `.env` and adjust as needed.

3. **Start the application:**
   ```bash
   docker-compose up --build
   ```

4. **Access the app:**  
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Technologies Used

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** .NET (with QuestPDF for PDF generation)
- **Storage:** MinIO (S3-compatible object storage)
- **Authentication:** JWT
- **Containerization:** Docker, Docker Compose

## Compliance

E-Facture Express is designed to help businesses comply with Morocco's e-invoicing requirements (Article 145-IX, effective 2026). The platform will integrate with the official DGI API as soon as it becomes available.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

[MIT License](LICENSE)
