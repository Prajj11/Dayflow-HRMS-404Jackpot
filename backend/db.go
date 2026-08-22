package main

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initPool(ctx context.Context) (*pgxpool.Pool, error) {
	return pgxpool.New(ctx, os.Getenv("SUPABASE_DB_URL"))
}
