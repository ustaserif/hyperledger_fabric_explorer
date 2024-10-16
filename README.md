
# 🚀 **Hyperledger Fabric & Explorer Development Environment**

A streamlined setup for developing, testing, and managing a **Hyperledger Fabric** network, integrated seamlessly with **Hyperledger Explorer** for real-time network visibility.

---

## ⚙️ **Getting Started**

### 🔧 1. **Start the Network with Explorer**

To start the network, follow these steps:

1. **Navigate to the `test-network` directory**:
   ```bash
   cd test-network
   ```
   
2. **Launch the network** with the following command:
   ```bash
   ./network.sh up createChannel -c mychannel -ca
   ```
   This will spin up the Fabric network and create a channel named `mychannel`. Additionally, the `-ca` flag starts the Certificate Authority (CA) services for the network.

3. **Adding a new peer** to **Org1**?  
   Simply use the commands provided in the `addPeer1.sh` script to quickly set up a peer for Org1.

4. Once the network is up and running, **Explorer** will be available at **port 8090**.

   Access it via your browser at:

   ```
   http://localhost:8090
   ```

   🔍 **Explorer Dashboard**:  
   Hyperledger Explorer provides a user-friendly interface to monitor and explore your network’s transactions, blocks, chaincodes, and peers.

---

### 🛠 **Troubleshooting**:
   - **Explorer not accessible on port 8090?**  
     If you're unable to access Explorer, try restarting it from the Docker console.  
     Run the following command to stop and restart the Docker services:
     ```bash
     docker-compose -f explorer/docker-compose-explorer.yaml down
     docker-compose -f explorer/docker-compose-explorer.yaml up -d
     ```

---

### 🔻 2. **Stop the Network**

When your development or testing session is complete, you can bring the network down with the following command:

```bash
./network.sh down
```

⚠️ **Important**:  
After stopping the network, it's essential to ensure that all Docker volumes are properly removed. This will prevent potential issues when restarting the network for future sessions.

---

## 💻 **Running the Asset-Transfer-Basic Application**

To explore and test chaincode functionality, you can run the **Asset-Transfer-Basic** application. Follow the steps below:

1. **Navigate to the Asset Transfer Directory**:
   ```bash
   cd asset-transfer-basic/application-gateway-typescript
   ```

2. **Install required dependencies** using `yarn`:
   ```bash
   yarn install
   ```

3. **Start the application** by running:
   ```bash
   cd src
   ts-node app.js
   ```

### 🚀 **Testing Chaincode Methods**

You can test various functionalities of the **Asset Transfer** chaincode by enabling/disabling the provided methods in the `app.js` file. Here’s an example of how you can customize which functions to run:

```javascript
// Initialize a set of asset data on the ledger using the chaincode 'InitLedger' function.
// await initLedger(contract);

// Return all the current assets on the ledger.
await getAllAssets(contract);

// Create a new asset on the ledger.
// await createAsset(contract);

// Update an existing asset asynchronously.
// await transferAssetAsync(contract);

// Get the asset details by assetID.
// await readAssetByID(contract);

// Update an asset which does not exist.
// await updateNonExistentAsset(contract);
```

🔑 **Tip**:  
Simply uncomment the method(s) you want to test and comment out the ones you don't. This way, you can control which operations to perform on the ledger.

---

## 📋 **Key Features of the Setup**:

- **Fabric Network**: A customizable, multi-org, multi-peer Hyperledger Fabric network.
- **Explorer Integration**: Real-time monitoring of the network, including transactions, chaincodes, and blocks via Hyperledger Explorer.
- **Chaincode Testing**: A ready-to-go asset transfer chaincode application in TypeScript for testing and development.

---

### 🧑‍💻 **Additional Resources**:
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/en/latest/)
- [Hyperledger Explorer GitHub](https://github.com/hyperledger/blockchain-explorer)

---

🎉 **Happy Developing with Hyperledger Fabric & Explorer!** 🎉
