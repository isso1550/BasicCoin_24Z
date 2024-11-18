CONFIG = {
    REGISTER_ENDPOINT : "/register_neighbor",
    BROADCAST_ENDPOINT : "/broadcast",
    NEIGHBORS_ENDPOINT : "/neighbors",
    JOIN_NET_ENDPOINT : "/join_network",
    LEAVE_NET_ENDPOINT: "/leave_network",
    GET_PARENT_ENDPOINT: "/parent",
    VISUALIZATION_ENDPOINT: "/vis",

    DIFFICULTY : 0,

    HASH_ALGO : "sha256",
    KEY_ALGO : "rsa",
    KEY_MODULUS_LEN : 4096,
    KEY_FORMAT : "pem",
    PK_TYPE : "spki",
    SK_TYPE : "pkcs8",
    SK_CIPHER : 'aes-256-cbc',

    
    GENESIS : {
        "type": "Block",
        "data": {
            "prev_hash": "GENESIS",
            "transaction": {
                "data": {
                    type: "Coinbase",
                    sender: "COINBASE",
                    receiver: "a00b7fb076ab2a2d7cf13b14852c0473b0888a81f7dbce6259af5aecf5881351",
                    amount: 100
                }
                
            },
            "nonce": 0,
            "timestamp": Date.now()
        },
        "hash": "GENESIS",
        "order": 1
    },

    VISHTML : [
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Network</title>
    <script
      type="text/javascript"
      src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"
    ></script>
    <style type="text/css">
      #mynetwork {
        width: 100vw;
        height: 100vh;
        position: absolute;
        border: 1px solid lightgray;
      }
    </style>
  </head>
  <body>
    <div id="mynetwork"></div>
    <script type="text/javascript">
      // create an array with nodes
      var nodes = new vis.DataSet([`
      ,
      `]);

      // create an array with edges
      var edges = new vis.DataSet([
      `,
      `
      ]);

      // create a network
      var container = document.getElementById("mynetwork");
      var data = {
        nodes: nodes,
        edges: edges,
      };
      var options = {
        physics: {
            "hierarchicalRepulsion": {
                springLength:150,
                springConstant: 0.9
            }
        },
        configure: {
        enabled: true,
        filter: 'physics, layout',
        showButton: true
        },
        layout:{
            hierarchical: {
                enabled: true,
                direction: "RL",
                sortMethod: "directed",
                nodespacing: 250
            }
        }
      
      };
      var network = new vis.Network(container, data, options);
    </script>
  </body>
</html>`

    ]
}

module.exports = CONFIG


