package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing metadata
type SmartContract struct {
	contractapi.Contract
}

// Metadata describes basic details of metadata storage
type Metadata struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	Owner     string `json:"owner"`
	Timestamp string `json:"timestamp"`
}

// InitLedger adds a base set of metadata to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// StoreMetadata adds new metadata to the world state with given details
func (s *SmartContract) StoreMetadata(ctx contractapi.TransactionContextInterface, key string, value string) error {
	metadata := Metadata{
		Key:       key,
		Value:     value,
		Owner:     ctx.GetClientIdentity().GetID(),
		Timestamp: ctx.GetStub().GetTxTimestamp().String(),
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, metadataJSON)
}

// GetMetadata returns the metadata stored in the world state with given id
func (s *SmartContract) GetMetadata(ctx contractapi.TransactionContextInterface, key string) (*Metadata, error) {
	metadataJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if metadataJSON == nil {
		return nil, fmt.Errorf("the metadata %s does not exist", key)
	}

	var metadata Metadata
	err = json.Unmarshal(metadataJSON, &metadata)
	if err != nil {
		return nil, err
	}

	return &metadata, nil
}

// UpdateMetadata updates an existing metadata in the world state with provided parameters
func (s *SmartContract) UpdateMetadata(ctx contractapi.TransactionContextInterface, key string, value string) error {
	exists, err := s.MetadataExists(ctx, key)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the metadata %s does not exist", key)
	}

	metadata := Metadata{
		Key:       key,
		Value:     value,
		Owner:     ctx.GetClientIdentity().GetID(),
		Timestamp: ctx.GetStub().GetTxTimestamp().String(),
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(key, metadataJSON)
}

// DeleteMetadata deletes a given metadata from the world state
func (s *SmartContract) DeleteMetadata(ctx contractapi.TransactionContextInterface, key string) error {
	exists, err := s.MetadataExists(ctx, key)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the metadata %s does not exist", key)
	}

	return ctx.GetStub().DelState(key)
}

// MetadataExists returns true when metadata with given ID exists in world state
func (s *SmartContract) MetadataExists(ctx contractapi.TransactionContextInterface, key string) (bool, error) {
	metadataJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return metadataJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating metadata chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting metadata chaincode: %v", err)
	}
} 