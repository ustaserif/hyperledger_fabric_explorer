# 🚀 Hyperledger Fabric & Explorer Development Environment

A streamlined setup for developing and managing a Hyperledger Fabric network with Explorer integration.

## ⚙️ Getting Started

### 1. Start the Network with Explorer

First, navigate to the `test-network` directory and bring up the network:

```bash
cd test-network
./network.sh up createChannel -c mychannel -ca
```

💡 **Tip**: If you're adding a new peer for Org1, use the provided commands in `addPeer1.sh`.

Once the network is up, Explorer should be running on **port 8090**.  
Access it via your browser:

```
http://localhost:8090
```

**Troubleshooting**:  
If Explorer isn't accessible on port 8090, restart it from the Docker console.

---

### 2. Stop the Network

When you're done, you can bring down the network with:

```bash
./network.sh down
```

⚠️ **Important**:  
After stopping the network, ensure that all Docker volumes are removed to prevent potential issues in future setups.

---

Enjoy exploring your Hyperledger Fabric network! 🎉
