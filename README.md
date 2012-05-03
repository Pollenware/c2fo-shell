c2fo-shell - text-based interface to Pollenware optimized collaborative auction platform

# USAGE

    $ ./c2fo -h
    Usage: c2fo [options]

    Options:

      -h, --help                      output usage information
      -V, --version                   output the version number
      -u, --user  <user name>         user name
      -i, --instance <instance name>  instance host name
      -e, --emulating <user name>     user to emulate
      -d, --debug                     turn on debug messages

# SIGN IN

Signing into the system with authentication credentials can take place either from the system prompt, when booting c2fo-shell, or after the shell is up, as a command:

## FROM SYSTEM PROMPT

### FAIL

    $ ./c2fo -u c2foUsername -i c2foInstance
    Password: ***********
    connecting...
    [error] check the login details, host or network
    connection could not be established: c2foUsername@c2foInstance
    c2fo (pollenware C2FO) v0.0.1 Mon Nov 14 2011 00:59:42 GMT+0000 (UTC)
    type 'h' for help
    c2fo> 

### SUCCEED

    $ ./c2fo -u c2foUsername -i c2foInstance -d
    Password: ***********
    connecting...
    c2foUsername@c2foInstance> 

## WITHIN C2FO CLI

    $ ./c2fo 
    c2fo (pollenware C2FO) v0.0.1 Mon Nov 14 2011 00:59:42 GMT+0000 (UTC)
    type 'h' for help
    c2fo> c2foUsername@c2foInstance
    Password: **********
    connecting...
    c2foUsername@c2foInstance> 

---

# CONNECTIONS

c2fo-shell handles multiplexing to many C2FO instances via support for separate connections and an ability to switch between them:

## LIST

    c2foUsername@c2foInstance> c
    {
      "1": "jsmihters84716@homeelectronics",
      "2": "walden0901@kbrothers",
      "3": "shartleyd787@autoiameri"
    }
    c2foUsername@c2foInstance>

## SWITCH BY ID

    c2foUsername@c2foInstance> 2
    walden0901@kbrothers>

## SWITCH BY NAME

    walden0901@kbrothers> shartleyd787@autoiameri
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

Once successfully connected to an C2FO instance, the environment can be displayed:

## DETAIL

    shartleyd787@autoiameri> e
    {
      "events": [
        "163"
      ],
      "invoices": 0,
      "instance": "autoiameri",
      "sessionCookie": "%2B0...cf37;",
      "id": 6,
      "lastActive": "2011-11-14T03:22:45.000Z",
      "user_name": "shartleyd787",
      "first_name": "Newland",
      "last_name": "Schofield",
      "user_id": 17352,
      "user_type": 3,
      "org_id": 31551276,
      "enrollment_status": 7,
      "is_net_negative": false,
      "messages": [],
      "timeElapse": "0d0h-3m-4s"
    }
    shartleyd787@autoiameri> 


## SPECIFIC ATTRIBUTE

    shartleyd787@autoiameri> e org_id
    31551276
    shartleyd787@autoiameri> 

---

# EVENTS

Events can be created, updated, and explored:

## CREATE

    autoiameri1@autoiameri> s
    Start time (YYYY-MM-DD HH:MM): 2011-12-20 11:00
    Duration (in minutes): 45
    Pay-thru date (YYYY-MM-DD): 2011-12-22
    New check date (YYYY-MM-DD): 2011-12-22
    Cash pool: 1000000
      Basket #1
        Minimum days (enter "e" for "earliest possible"): e
        Maximum days (enter "L: for "latest possible"): 10
        Starting offer: .01
        Offer increment: .01
        Hurdle type: apr
        Hurdle rate: 5
      Basket #2
        Minimum days (enter "e" for "earliest possible"): 11
        Maximum days (enter "L: for "latest possible"): 30
        Starting offer: .01
        Offer increment: .01
        Hurdle type: apr
        Hurdle rate: 5
      Basket #3
        Minimum days (enter "e" for "earliest possible"): 31
        Maximum days (enter "L: for "latest possible"): 45
        Starting offer: .01
        Offer increment: .01
        Hurdle type: apr
        Hurdle rate: 5
      Basket #4
        Minimum days (enter "e" for "earliest possible"): 46
        Maximum days (enter "L: for "latest possible"): L
        Starting offer: .01
        Offer increment: .01
        Hurdle type: apr
        Hurdle rate: 5
      Basket #5
        Minimum days (enter "e" for "earliest possible"): .
    autoiameri1@autoiameri>

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

Invoices are pulled out of an C2FO instance _one page at a time_, where a _page_ is defined as the number of records configured in `message-catalog/c2fo/invoice.js/MCat.invoicesPageSize`.  c2fo-shell keeps track of the pagination and will pull down new invoices with every call until there are no more to retrieve.  Once the c2fo-shell user has locally downloaded the invoice set she needs, they can be printed, logged, or otherwise manipulated:

## DOWNLOAD 1 PAGE

    shartleyd787@autoiameri> i
    starting invoice retrieval...
    shartleyd787@autoiameri> 
    shartleyd787@autoiameri> j Object.keys(c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local).length 
    40
    shartleyd787@autoiameri> i
    starting invoice retrieval...
    autoiameri - total invoices retrieved: 40
    shartleyd787@autoiameri> j Object.keys(c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local).length 
    80 

## DOWNLOAD USING FILTERS

### BY DUE DATE

    shartleyd787@autoiameri> i due>2012-11-01
    [...]
 
### BY AMOUNT

    shartleyd787@autoiameri> i amount<55000
    [...]
 
### BY EVENT

    shartleyd787@autoiameri> i event=16
    [...]
 
### BY BASKET

    shartleyd787@autoiameri> i basket=1234
    [...]

### SPECIFY SORT ORDER OF RETIEVED PAGE

    shartleyd787@autoiameri> i due>2012-11-01 sortOn=amount
    [...]
 
### MIX & MATCH AS DESIRED...

    shartleyd787@autoiameri> i due=2012-11-01 amount<211000 sortOn=amount
    [...]
 
## PRINT 

    shartleyd787@autoiameri> i p
    pollenware_invoice_id,supplier_id,payment_due_date,amount,group_id,name
    8594105,31553828,2011-09-04,319.2,,Simeon Hartley D Enterp
    8596112,31554286,2011-09-08,108256.56,,Simeon Hartley D Enterp
    8596113,31554286,2011-09-08,139181.28,,Simeon Hartley D Enterp
    8596115,31554286,2011-09-08,39876,,Simeon Hartley D Enterp
    [...]

## CLEAR

    shartleyd787@autoiameri> i c
    shartleyd787@autoiameri> j Object.keys(c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local).length
    0
    shartleyd787@autoiameri>

## INCLUDE/EXCLUDE AS SUPPLIER

    shartleyd787@autoiameri> t e127689 e128881 i129221...
    autoiameri - invoices updated
    shartleyd787@autoiameri> 

## INCLUDE/EXCLUDE AS BUYER

    autoiameri1@autoiameri> t e3155500|127689 e3155689|128881...
    autoiameri1@autoiameri> 
    autoiameri - invoices updated
    autoiameri1@autoiameri> 

---

# LOG

A simple logging facility allows the c2fo-shell user to write her data to disk at any time:

## PRINT

    shartleyd787@autoiameri> l
    [
     200,
     0,
     "pollenware_invoice_id,supplier_id,payment_due_date,amount,group_id,name",
     "8594105,31553828,2011-09-04,319.2,,Waltman Pharmaceuticals Inc",
     "8596112,31554286,2011-09-08,108256.56,,Garnier",
    [...]

## APPEND CURRENT TO DISK

    shartleyd787@autoiameri> l w
    writing log to log/c2fo.log...
    shartleyd787@autoiameri> 

## CLEAR

    shartleyd787@autoiameri> l c
    log cleared
    shartleyd787@autoiameri> 

---

# DISCOUNTS

Pre-offers before an event and offers during an event are both supported transparently within the *o* (*offer*) command:

## OFFER (supplier-only) - Not acting as bid agent

    shartleyd787@autoiameri> b 163 0 f
    {
      "id": 66929,
      "total_invoice_amount": 8778.64,
      "num_invoices": 4,
      "supplier_id": 31551276,
    [..]
    shartleyd787@autoiameri> o 163 66929 120
    autoiameri - offer placed
    shartleyd787@autoiameri>

## OFFER (supplier-only) - Acting as bid agent

    shartleyd787@autoiameri> b 163 0 t
    {
      "id": 66929,
      "total_invoice_amount": 8778.64,
      "num_invoices": 4,
      "supplier_id": 31551276,
    [..]
    shartleyd787@autoiameri> o 163 66929 120
    autoiameri - offer placed
    shartleyd787@autoiameri>

---

# EVENTS

To monitor a scheduled or live event, use the  *m* (*monitor*) command:

## MONITOR AN EVENT

    shartleyd787@autoiameri> m 163
    autoiameri - scheduled event #163
    autoiameri - 1-10 Days pre-offer: 0.2
    autoiameri - 11-30 Days pre-offer: 0.31
    autoiameri - 31-45 Days pre-offer: 0.4
    shartleyd787@autoiameri> 
    autoiameri - live event #163
    autoiameri - 1-10 Days offer: 0.2 status: GREEN
    autoiameri - 11-30 Days offer: 0.31 status: RED
    autoiameri - 31-45 Days offer: 0.4 status: RED
    shartleyd787@autoiameri> 
    autoiameri - awaiting buyer decision event #163
    autoiameri - 1-10 Days offer: 0.2 status: GREEN
    autoiameri - 11-30 Days offer: 0.31 status: RED
    autoiameri - 31-45 Days offer: 0.4 status: RED
    shartleyd787@autoiameri> 
    autoiameri - awaiting buyer decision event #163
    autoiameri - 1-10 Days offer: 0.2 status: GREEN
    autoiameri - 11-30 Days offer: 0.31 status: RED
    autoiameri - 31-45 Days offer: 0.4 status: RED
    shartleyd787@autoiameri>
    autoiameri - awaiting buyer decision event #163
    autoiameri - 1-10 Days offer: 0.2 status: GREEN
    autoiameri - 11-30 Days offer: 0.31 status: RED
    autoiameri - 31-45 Days offer: 0.4 status: RED
    shartleyd787@autoiameri>
    autoiameri - monitor stopped, event over: #163
    shartleyd787@autoiameri>

## STOP MONITORING AN EVENT

    shartleyd787@autoiameri> m 163 off
    shartleyd787@autoiameri>

## RETRIEVE PRE-OFFER DATA (buyer-only)

    autoiameri1@autoiameri> p 163
    event_id,"supplier_name",supplier_id,"basket_title",total_invoice_amount,discount_amount,apr_amount
    163,"Foo Widgets Inc",919988,"1-10 Days",4102.77,0.3,27.0
    163,"Foo Widgets Inc",919988,"31-45 Days",57215.64,0.4,3.66
    163,"Acme Hardware",434020,"1-10 Days",24518.99,0.3,15.54
    163,"Acme Hardware",434020,"11-30 Days",456201.51,0.4,6.1
    163,"Acme Hardware",434020,"31-45 Days",283642.97,0.5,4.89

    autoiameri - pre-offers received
    autoiameri1@autoiameri> p 163

## RETRIEVE LIVE OFFER DATA (buyer-only)

    autoiameri1@autoiameri> o 163
    autoiameri1@autoiameri> 
    event_id,"supplier_name",supplier_id,"basket_title",total_invoice_amount,discount_percent,discount_amount,apr_amount,status
    163,"Beta Manuf Co",711140,"1-10 Days",1698.0,0.15,2.55,9.17,0
    163,"Beta Manuf Co",711140,"11-30 Days",13809.0,0.05,6.9,0.72,0
    163,"Beta Manuf Co",711140,"31-45 Days",11175.0,0.1,11.18,0.97,0
    163,"Beta Manuf Co",711140,"46-60 Days",1764.0,0.05,0.88,0.36,0
    163,"Foo Widgets Inc",919988,"11-30 Days",32070.98,0.31,99.42,4.11,0
    163,"Foo Widgets Inc",919988,"1-10 Days",4102.77,0.3,12.31,27.0,2
    163,"Foo Widgets Inc",919988,"31-45 Days",57215.64,0.4,228.86,3.66,0
    163,"Acme Hardware",434020,"1-10 Days",24518.99,0.3,73.56,15.54,2
    163,"Acme Hardware",434020,"11-30 Days",456201.51,0.4,1824.81,6.1,0
    163,"Acme Hardware",434020,"31-45 Days",283642.97,0.5,1418.21,4.89,0

    autoiameri - offers retrieved
    autoiameri1@autoiameri> 

## RETRIEVE AWARD DATA (supplier-only)

    shartleyd787@autoiameri> a 2011-09-23
    shartleyd787@autoiameri>
    voucher,date,due,amount,discount,event,winner
    569308,2011-11-02,2012-01-13,2702.55,0.4,166,false
    569308,2011-11-02,2012-01-14,835.55,0.4,166,false
    569308,2011-11-02,2012-01-15,4674.6,0.4,166,false
    578279,2011-11-15,2012-01-20,5700.46,0.4,166,false
    578279,2011-11-15,2012-01-20,5102.27,0.4,166,false
    578279,2011-11-15,2012-01-20,6772.98,0.4,166,false
    578279,2011-11-17,2012-01-21,7998.17,0.4,166,false
    578279,2011-11-14,2012-01-24,4187.15,0.4,166,false
    578279,2011-11-14,2012-01-24,3180.3,0.4,166,false
    578279,2011-11-15,2012-01-21,12072.23,0.4,166,false
    578279,2011-11-15,2012-01-24,3989.38,0.4,166,false
    552459,2011-10-03,2011-12-13,842.8,0.3,166,true
    553302,2011-10-03,2011-12-13,183.46,0.3,166,true
    553302,2011-10-04,2011-12-17,917.28,0.3,166,true
    552459,2011-10-04,2011-12-17,2159.23,0.3,166,true
    autoiameri - award data retrieved
    shartleyd787@autoiameri>

---

# LOCKS (buyer-only)

Individual basket statuses are edited via disposition locks:

    autoiameri1@autoiameri> L 304 34218890 92448 1
    {"details":["34218890","basket","92448","status"],"supplierId":"34218890","status":"1"}    

