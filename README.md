# Loop Store Monitoring API

A Node.js powered REST API that monitors store online/offline status and generates detailed reports on uptime and downtime — accurately handling business hours and timezone-specific logic.

## Features

- **CSV-based Data Ingestion**: Import store status, business hours, and timezone data from CSV files.
- **Uptime/Downtime Report Generation**: Calculates store availability metrics — filtered by business hours and timezone.
- **Real-time Report Status**: Trigger reports asynchronously and poll for completion.
- **Timezone-Aware Calculations**: Automatically converts timestamps to store-local time for accuracy.

## Tech Stack

- **Node.js & Express.js**: REST API
- **Sequelize ORM**: Database models & query abstraction
- **SQLite**: Lightweight DB for local development (easily swappable with PostgreSQL)
- **CSV Parser/Writers**: Efficient CSV file reading and writing
- **Moment-Timezone**: Timezone handling & conversion

## CSV Data Files

Place the following files in the `/data` directory:

| Filename           | Description                                      |
| ------------------ | ------------------------------------------------ |
| `store_status.csv` | Store online/offline status logs with timestamps |
| `menu_hours.csv`   | Weekly business hours per store                  |
| `timezone.csv`     | Timezone info mapped to each store               |

## Installation

### Clone the repository:

```bash
git clone https://github.com/your-username/loop-store-monitoring.git
cd loop-store-monitoring
```

### Install dependencies:

```
npm install
```

### Add CSV files:

Place store_status.csv, menu_hours.csv, and timezone.csv into the /data directory.

### Start the server:

```
npm start
```

## API Endpoints

### Trigger Report Generation

**POST** /api/trigger_report

### Response:

```
{
  "report_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Get Report Status / Download Report

**GET** /api/get_report/:reportId

### If Report is Still Processing:

```
{
  "status": "Running"
}
```

### If Report is Ready:

```
store_id,uptime_last_hour(mins),uptime_last_day(hrs),uptime_last_week(hrs),downtime_last_hour(mins),downtime_last_day(hrs),downtime_last_week(hrs)
```

## How It Works

- CSV data is ingested into a SQLite database.
- When a report is triggered:
  - Status logs are analyzed per store.
  - Uptime/downtime is calculated across various windows: last hour, day, week.
  - Only business hours (from menu_hours.csv) are considered.
  - All timestamps are converted based on the store's timezone (timezone.csv).
  - A downloadable report is generated and stored locally.

## Example Report Output

```
store_id,uptime_last_hour(in minutes),uptime_last_day(in hours),uptime_last_week(in hours),downtime_last_hour(in minutes),downtime_last_day(in hours),downtime_last_week(in hours)
d84a4552-3668-4075-ad1d-16840294f818,60,22.5,165,0,1.5,3
```
