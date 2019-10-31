const dotenv = require('dotenv')
const AWS = require('aws-sdk')
const Web3 = require('web3')
var https = require('https')
var util = require('util')

dotenv.config()

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
})

const ETHERSCAN_URL = process.env.ETHERSCAN_URL

var docClient = new AWS.DynamoDB.DocumentClient()

exports.handler = async function(event, context, callback) {
    try {

        let web3 = new Web3(process.env.KOVAN_RPC_URL1)
        await web3.eth.net.isListening()
            .catch((err) => web3 = new Web3(process.env.KOVAN_RPC_URL))

        let esmContract = new web3.eth.Contract(JSON.parse(process.env.ESM_CONTRACT_ABI), process.env.ESM_CONTRACT_ADDRESS)
        let currentSum = await esmContract.methods.Sum().call()

        let savedSum = await getSum() || 0

        console.log("Current sum " + currentSum + " Saved sum " + savedSum)

        if (currentSum != savedSum) {
            notifyChat(currentSum, savedSum)
        }

        saveSum(currentSum)

        callback(null, currentSum)

    } catch (e) {
        console.error(e)
        callback(Error(e))
    }
}

async function getSum() {
    var getParams = {
        TableName: 'EsmSum',
        Limit: 1
    }
    let data = await docClient.scan(getParams).promise()
    if (data.Items[0]) {
        return data.Items[0]['Sum']
    }
}

function saveSum(sum) {
    var updateParams = {
        TableName: 'EsmSum',
        Key: {
            'Id': 1
        },
        UpdateExpression: "set #Sum = :sum, #Ts = :ts",
        ExpressionAttributeValues: {
            ":sum": sum,
            ":ts": Date.now()
        },
        ExpressionAttributeNames: {
            "#Sum": "Sum",
            "#Ts": "Ts"
        },
        ReturnValues: "UPDATED_NEW"
    }

    docClient.update(updateParams, function(err, data) {
        if (err) {
            console.error("Failed to persist current block")
            throw err
        } else {
            console.log("Persisted last queried block", data)
        }
    })
}

function notifyChat(currentSum, oldSum) {

    text = "*ESM MKR Sum changed*\n\n*Current value*:" + currentSum + "\n*Old value*:" + oldSum

    var message = {
        "username": "ESM watcher",
        "icon_emoji": ":warning:",
        "text": text
    }

    console.log(message)

    var POST_OPTIONS = {
        hostname: process.env.SERVER,
        path: process.env.PATH,
        method: 'POST',
    };

    const req = https.request(POST_OPTIONS, (res) => {
        res.setEncoding('utf8')
    });

    req.on('error', (e) => {
        console.error(e.message)
    });

    req.write(util.format("%j", message));
    req.end()
}