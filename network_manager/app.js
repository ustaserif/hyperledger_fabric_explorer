import { addChannel, addOrg3, initializeCA } from './controllers/orgController.js';
import { addPeer } from './controllers/peerController.js';
import express from 'express';

const PORT = 3001; 

// const reqDataPeer1 = {
//     network: {
//         caPort: '7054',
//         org: 'org1',
//         mspID: 'Org1MSP',
//         channel: 'mychannel'
//     },
//     peer: {
//         id: 'peer1',
//         secret: 'peer1pw',
//         port: '8051',
//         chainCodePort: '8052',
//         corePort: '9446'
//     },
//     endorser: {
//         id: 'peer0',
//         port: '7051',
//     },
// }
// const reqDataPeer2 = {
//     network: {
//         caPort: '7054',
//         org: 'org1',
//         mspID: 'Org1MSP',
//         channel: 'mychannel'
//     },
//     peer: {
//         id: 'peer2',
//         secret: 'peer2pw',
//         port: '10051',
//         chainCodePort: '10052',
//         corePort: '9450'
//     },
//     endorser: {
//         id: 'peer0',
//         port: '7051',
//     },
// }

// const reqDataPeer1Org2 = {
//     network: {
//         caPort: '8054',
//         org: 'org2',
//         mspID: 'Org2MSP',
//         channel: 'mychannel'
//     },
//     peer: {
//         id: 'peer1',
//         secret: 'peer1pw',
//         port: '11051',
//         chainCodePort: '11052',
//         corePort: '9451'
//     },
//     endorser: {
//         id: 'peer0',
//         port: '9051',
//     },
// }

// const reqDataPeer0Org3 = {
//     network: {
//         caPort: '10054',
//         org: 'org3',
//         mspID: 'Org3MSP',
//         channel: 'mychannel'
//     },
//     peer: {
//         id: 'peer0',
//         secret: 'peer0pw',
//         port: '12051',
//         chainCodePort: '20051',
//         corePort: '9460'
//     },
//     endorser: {
//         id: 'peer0',
//         port: '12051',
//     },
// }


// await addPeer(reqDataPeer1);

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Add a POST route
app.post('/addPeer', async (req, res) => {
    // Access POST data through req.body
    const data = req.body;
    console.log('Data: ', data);

    const response = await addPeer(data);
    if(response === null){
        res.send('Add failed!');
    }
    
    // Handle the data as needed
    res.send('Peer Added!');
});

// app.post('/initializeCA', async (req, res) => {
//     // Access POST data through req.body
//     const data = req.body;
//     console.log('Data: ', data);

//     const response = await initializeCA(data);
//     if(response === null){
//         res.send('Add failed!');
//     }
    
//     // Handle the data as needed
//     res.send('Org Added!');
// });

//addOrgToChannel
// app.post('/addOrgToChannel', async (req, res) => {
//     // Access POST data through req.body
//     const data = req.body;
//     console.log('Data: ', data);

//     const response = await addChannel(data);
//     if(response === null){
//         res.send('Add failed!');
//     }
    
//     // Handle the data as needed
//     res.send('Org Added!');
// });

app.post('/addOrg3', async (req, res) => {
    // Access POST data through req.body
    const data = req.body;
    console.log('Data: ', data);

    const response = await addOrg3(data);
    if(response === null){
        res.send('Add failed!');
    }
    
    // Handle the data as needed
    res.send('Peer Added!');
});


// set ip and port, listen for requests
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}.`);
});