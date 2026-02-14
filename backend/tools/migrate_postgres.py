import os
from sqlalchemy import create_engine, MetaData, text


def _ensure_sslmode(url: str) -> str:
    if "sslmode=" in url:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}sslmode=require"


def main() -> int:
    source_url = os.environ.get("SOURCE_DB")
    target_url = os.environ.get("TARGET_DB")

    if not source_url or not target_url:
        print("Missing SOURCE_DB or TARGET_DB environment variables.")
        return 1

    # Enforce sslmode for hosted Postgres
    source_url = _ensure_sslmode(source_url)
    target_url = _ensure_sslmode(target_url)

    source_engine = create_engine(source_url)
    target_engine = create_engine(target_url)

    meta = MetaData()
    meta.reflect(bind=source_engine)

    # Ensure target schema exists
    for table in meta.sorted_tables:
        table.create(target_engine, checkfirst=True)

    with target_engine.begin() as target_conn:
        # Truncate target to avoid duplicates
        for table in meta.sorted_tables:
            target_conn.execute(
                text(f'TRUNCATE TABLE "{table.name}" RESTART IDENTITY CASCADE')
            )

        # Copy data table-by-table
        with source_engine.connect() as source_conn:
            for table in meta.sorted_tables:
                result = source_conn.execute(table.select())
                rows = result.fetchall()
                if not rows:
                    continue

                # Convert rows to dicts for bulk insert
                columns = result.keys()
                payload = [dict(zip(columns, row)) for row in rows]
                target_conn.execute(table.insert(), payload)

    print("Migration completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
