ocap-shell - text-based interface to Pollenware optimized collaborative auction platform

# SIGN IN

Signing into the system with authentication credentials can take place either from the system prompt, when booting ocap-shell, or after the shell is up, as a command:

## FROM SYSTEM PROMPT

### FAIL

    $ ./ocap -u c2foUsername -i c2foInstance
    Password: ***********
    connecting...
    [error] check the login details, host or network
    connection could not be established: c2foUsername@c2foInstance
    ocap (pollenware OCAP) v0.0.1 Mon Nov 14 2011 00:59:42 GMT+0000 (UTC)
    type 'h' for help
    ocap> 

### SUCCEED

    $ ./ocap -u c2foUsername -i c2foInstance
    Password: ***********
    connecting...
    c2foInstance - session granted
    c2foInstance - retrieved user details
    c2foInstance - undefined
    c2foInstance - found event #23
    c2foInstance - #23: countdown to go-live: 1d17h58m55s
    c2foInstance - #23: duration: 0d0h30m0s
    c2foInstance - #23: new check date: 2011-11-17T00:00:00Z
    c2foInstance - #23: pay-thru date: 2011-11-17T00:00:00Z
    c2foInstance - #23: status: accepting pre-offers
    c2foUsername@c2foInstance> 

## WITHIN OCAP CLI

    $ ./ocap 
    ocap (pollenware OCAP) v0.0.1 Mon Nov 14 2011 00:59:42 GMT+0000 (UTC)
    type 'h' for help
    ocap> c2foUsername@c2foInstance
    Password: **********
    connecting...
    c2foInstance - session granted
    [...]

---

# CONNECTIONS

ocap-shell handles multiplexing to many OCAP instances via support for separate connections and an ability to switch between them:

## LIST

    c2foUsername@c2foInstance> c
    {
      "1": "jsmihters84716@homeelectronics",
      "2": "walden0901@kbrothers",
      "3": "shartleyd787@autoiameri"
    }
    c2foUsername@c2foInstance>

## SWITCH BY ID

    c2foUsername@c2foInstance> c 2
    walden0901@kbrothers>

## SWITCH BY NAME

    walden0901@kbrothers> c 3
    shartleyd787@autoiameri>

## DELETE 

    shartleyd787@autoiameri> c
    {
      "1": "jsmihters84716@homeelectronics",
      "2": "walden0901@kbrothers",
      "3": "shartleyd787@autoiameri"
    }
    shartleyd787@autoiameri> d 2
    shartleyd787@autoiameri> c
    {
      "1": "jsmihters84716@homeelectronics",
      "3": "shartleyd787@autoiameri"
    }
    shartleyd787@autoiameri> 

---

# ENVIRONMENT

Once successfully connected to an OCAP instance, the environment can be displayed:

## DETAIL

    shartleyd787@autoiameri> e
    {
      "events": [
        "163"
      ],
      "invoices": 0,
      "user": "pete_admin",
      "instance": "autoiameri",
      "sessionCookie": "%2B0...cf37;",
      "id": 6,
      "lastActive": "2011-11-14T03:22:45.000Z",
      "user_name": "shartleyd787",
      "first_name": "Newland",
      "last_name": "Schofield",
      "user_id": 17352,
      "user_type": 3,
      "org_id": 21441276,
      "enrollment_status": 7,
      "is_net_negative": false,
      "messages": [],
      "timeElapse": "0d0h-3m-4s"
    }
    shartleyd787@autoiameri> 


## SPECIFIC ATTRIBUTE

    shartleyd787@autoiameri> e org_id
    21441276
    shartleyd787@autoiameri> 

---

# EVENTS

Events can be explored by dumping all the information to the screen or log, or optionally pulling out specific attributes for viewing:

## DETAIL 

    shartleyd787@autoiameri> e events
    {
      "23": {
        "event_id": 23,
        "org_id": 21428986,
        "buyer_id": 21428986,  
        "is_live": false,
        "is_buyer_live": false,
        [...]

##  SPECIFIC ATTRIBUTE

    shartleyd787@autoiameri> j c2fo.auth.connections[c2fo.auth.connectionString()].events[10].start_time
    "2011-11-15T19:00:00.000Z"
    shartleyd787@autoiameri>

##  ALL BASKET DETAIL

Relevant baskets within an event can also be displayed:

    shartleyd787@autoiameri> b 23
    {
      "title": "1-10 Days",
      "id": 107,
      "bid_increment": 0.03,
      [...]

## 1 BASKET DETAIL

    shartleyd787@autoiameri> b 23 0
    {
      "title": "1-10 Days",
      "id": 107,
      "bid_increment": 0.03,
      "starting_bid": 0.03,
      "is_discount_based": false,
      "min": null,
      "max": 10
    }
    shartleyd787@autoiameri>

---

# INVOICES

Invoices are pulled out of an OCAP instance _one page at a time_, where a _page_ is defined as the number of records configured in `config/ocap.js/Config.invoicesPageSize`.  ocap-shell keeps track of the pagination and will pull down new invoices with every call until there are no more to retrieve.  Once the ocap-shell user has locally downloaded the invoice set she needs, they can be printed, logged, or otherwise manipulated:

## DOWNLOAD 1 PAGE

    shartleyd787@autoiameri> i
    starting invoice retrieval...
    shartleyd787@autoiameri> 
    autoiameri - total invoices: 40
    autoiameri - invoices retrieved
    shartleyd787@autoiameri> j Object.keys(c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local).length 
    40
    shartleyd787@autoiameri> i
    starting invoice retrieval...
    shartleyd787@autoiameri> 
    autoiameri - total invoices: 40
    autoiameri - invoices retrieved
    shartleyd787@autoiameri> j Object.keys(c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local).length 
    80 

## DOWNLOAD USING FILTERS

### BY DUE DATE

    shartleyd787@autoiameri> i duedate>2012-11-01
    [...]
 
### BY AMOUNT

    shartleyd787@autoiameri> i amount<55000
    [...]
 
### BY EVENT

    shartleyd787@autoiameri> i event=16
    [...]
 
### SPECIFY SORT ORDER OF RETIEVED PAGE

    shartleyd787@autoiameri> i duedate>2012-11-01 sortOn=amount
    [...]
 
### MIX & MATACH AS DESIRED...

    shartleyd787@autoiameri> i duedate=2012-11-01 amount<211000 sortOn=amount
    [...]
 
## PRINT 

    shartleyd787@autoiameri> i p
    printing invoices...
    pollenware_invoice_id,supplier_id,payment_due_date,amount,group_id,name
    8594105,21443828,2011-09-04,319.2,,Waltman Pharmaceuticals Inc
    8596112,21444286,2011-09-08,108256.56,,Simeon Hartley D Entep
    8596113,21444286,2011-09-08,139181.28,,Simeon Hartley D Entep
    8596115,21444286,2011-09-08,39876,,Simeon Hartley D Entep
    [...]

## CLEAR

    shartleyd787@autoiameri> i c
    trashing local copies of invoices...
    shartleyd787@autoiameri> j Object.keys(c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local).length
    0
    shartleyd787@autoiameri>

## INCLUDE/EXCLUDE AS SUPPLIER

    shartleyd787@autoiameri> t e127689 e128881 i129221...
    updating invoices...
    shartleyd787@autoiameri> autoiameri - successful invoice update
    autoiameri - invoices updated
    shartleyd787@autoiameri> 

## INCLUDE/EXCLUDE AS BUYER

    autoiameri1@autoiameri> t e2144500|127689 e2144689|128881...
    updating invoices...
    autoiameri1@autoiameri> autoiameri - successful invoice update
    autoiameri - invoices updated
    autoiameri1@autoiameri> 

---

# LOG

A simple logging facility allows the ocap-shell user to write her data to disk at any time:

## PRINT

    shartleyd787@autoiameri> l
    [
     200,
     0,
     "pollenware_invoice_id,supplier_id,payment_due_date,amount,group_id,name",
     "8594105,21443828,2011-09-04,319.2,,Waltman Pharmaceuticals Inc",
     "8596112,21444286,2011-09-08,108256.56,,Garnier",
    [...]

## APPEND CURRENT TO DISK

    shartleyd787@autoiameri> l w
    writing log to log/ocap.log...
    shartleyd787@autoiameri> 

## CLEAR

    shartleyd787@autoiameri> l c
    log cleared
    shartleyd787@autoiameri> 

---

# DISCOUNTS

Pre-offers before an event and offers during an event are both supported transparently within the *o* (*offer*) command:

## OFFER

    shartleyd787@autoiameri> b 163 0
    {
      "id": 66929,
      "total_invoice_amount": 8778.64,
      "num_invoices": 4,
      "supplier_id": 21441276,
    [..]
    shartleyd787@autoiameri> o 163 66929 120
    placing offer...
    shartleyd787@autoiameri> autoiameri - successful offer
    autoiameri - offer placed
    shartleyd787@autoiameri> 


