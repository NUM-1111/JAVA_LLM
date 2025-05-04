package db

import (
	"context"
	"log"

	"github.com/milvus-io/milvus/client/v2/milvusclient"
)

var Milvus *milvusclient.Client
var milvusCTX = context.Background()

func InitMilvus(addr string) {
	var err error
	Milvus, err = milvusclient.New(milvusCTX, &milvusclient.ClientConfig{
		Address: addr,
	})
	if err != nil {
		log.Fatalf("Failed to connect to Milvus: %v", err)
	}
	log.Println("[Milvus] service is running.")
}

func CloseMilvus() {
	if Milvus != nil {
		Milvus.Close(milvusCTX)
	}
	log.Println("[Milvus] service shutdown.")
}
