const fs = require('fs');
f = './tran_base'
f = './block_base'
f = null

if (f!=null) {
    fs.readFile(f, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        j = JSON.parse(data)
      
        if (f == './block_base'){
          //j.hash = null
      
          //j['type'] = 'Transaction'
      
          //j['data']['prev_hash'] = null
          //j['hash'] = "a85244fdc550f9b5fdcbf11256948e086510d82c50c933aa328f0b83d5ed30dc"
      
          //j['data'] = null
      
          j = {}
      
          payload = j
          console.log(payload)
          url ='http://localhost:5000/broadcast'
          fetch(url,
              {
                  method: "POST",
                  body: JSON.stringify(payload),
                  headers: { 'Content-type': 'application/json; charset=UTF-8' },
                  signal: AbortSignal.timeout(1500)   
              })
              .then(function (resp) {
                  resp_status = resp.status
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })
        }
      });
} else {
    f = 'register'
    //f = 'join_net'
    //f = 'leave_net'
    //f = 'delete'
    //f = 'put'
    //f = 'parent'
    //f = 'sync_chain'
    if (f == 'register'){
        j = {data:
            {
                source: 5006
            }}

        j['data'] = {}    
        j = {a:1}
        j = {}
        payload = j
        console.log(payload)
        url ='http://localhost:5000/register_neighbor'
        fetch(url,
              {
                  method: "POST",
                  body: JSON.stringify(payload),
                  headers: { 'Content-type': 'application/json; charset=UTF-8' },
                  signal: AbortSignal.timeout(1500)   
              })
              .then(function (resp) {
                  resp_status = resp.status
                  //return resp
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })
    }
    if (f=='join_net'){
        url ='http://localhost:5000/join_network'
        fetch(url,
              {
                  method: "GET",
              })
              .then(function (resp) {
                  resp_status = resp.status
                  //return resp
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })

    }
    if (f=='leave_net'){
        url ='http://localhost:5000/leave_network'
        fetch(url,
              {
                  method: "GET",
              })
              .then(function (resp) {
                  resp_status = resp.status
                  return resp
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })

    }
    if (f=='delete'){
        url ='http://localhost:5000/neighbors'
        fetch(url,
              {
                  method: "DELETE",
              })
              .then(function (resp) {
                  resp_status = resp.status
                  return resp
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })

    }
    if (f == 'put'){
        j = {
            new_master: 'http://localhost:5010',
            leaving_node: 'http://localhost:5001'
        }
        j['new_master']= -1
        j['new_master'] = {}
        j = {}
        payload = j
        console.log(payload)
        url ='http://localhost:5000/neighbors'
        fetch(url,
              {
                  method: "PUT",
                  body: JSON.stringify(payload),
                  headers: { 'Content-type': 'application/json; charset=UTF-8' },
                  signal: AbortSignal.timeout(1500)   
              })
              .then(function (resp) {
                  resp_status = resp.status
                  return resp
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })
    }
    if (f=='parent'){
        url ='http://localhost:5000/parent?undefined'
        fetch(url,
              {
                  method: "GET",
              })
              .then(function (resp) {
                  resp_status = resp.status
                  //return resp
                  return resp.json()
              })
              .then(function (data) {
                  console.log(resp_status, data)
                  return
              })
              .catch((err) => {
                  console.warn(err)
              })

    }
    if (f == 'sync_chain'){
        j = {type:'Sync_Chain'}
    
        payload = j
        console.log(payload)
        url ='http://localhost:5000/broadcast'
        fetch(url,
            {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { 'Content-type': 'application/json; charset=UTF-8' },
                signal: AbortSignal.timeout(1500)   
            })
            .then(function (resp) {
                resp_status = resp.status
                return resp
                return resp.json()
            })
            .then(function (data) {
                console.log(resp_status, data)
                return
            })
            .catch((err) => {
                console.warn(err)
            })
      }
}



