package main

import (
	"context"
	"os"

	"github.com/redis/go-redis/v9"
)

func initRedis(ctx context.Context) (*redis.Client, error) {
	opts, err := redis.ParseURL(os.Getenv("REDIS_URL"))
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return client, nil
}
