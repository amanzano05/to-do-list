//-------------- packeges needed --------------------//
const express =  require("express");
const bodyParser = require("body-parser");
const mongoose = require ('mongoose');
const _ = require ("lodash");

//-------------- setup for the Packages --------------------//
//own module
const date = require(__dirname+"/date.js");
//initialize express
const app = express();

//set the EJS
app.set('view engine', 'ejs')
//set bodyParser
app.use(bodyParser.urlencoded({extended: true}));
//set shared folder for resources
app.use(express.static("public"));


//--------------database--------------------//
//connect to the database. the other parameters are for aviod some errors
//for local: "mongodb://localhost:27017/toDoList"
//for remote: "mongodb+srv://amanzano05:Magooz85@apps.el2pr.mongodb.net/todoListDB"
mongoose.connect("mongodb+srv://amanzano05:Magooz85@apps.el2pr.mongodb.net/todoListDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})

//schema for the to do list
const itemsSchema = new mongoose.Schema({name: String});

//create model
const Item = mongoose.model ("Item", itemsSchema);

//some default items

const item1 = new Item({name: "Welcome to your todoList!"});
const item2 = new Item({name: "Hit the + button to add a new item."});
const item3 = new Item({name: "<-- Hit this to delete an item"});

const defaultItems = [item1, item2, item3];


// schema for custom to listTitle
const listSchema = new mongoose.Schema({
  name : String,
  items: [itemsSchema]
});

//model for custom to do list
const List = mongoose.model("List", listSchema);

// //format the date as 'Thursday, August 6'
// var dayToPass = date.getDate();


//-------------- routes --------------------//
//handler for route home
app.get("/", (reqHome, resHome)=>{
  //add the default items only if the
  //database is empty
  //find the items on the data base
  Item.find((err, items)=>{
    //if the data base is empty insert the defaults
    if (items.length===0){
      Item.insertMany(defaultItems, (err)=>{
        if (err){
          console.log(err);
        }else{
          console.log("Succesfully saved all the items");
        }
      });
      //after adding the default redirect to this
      //route again
      resHome.redirect("/");

    //if the database is not empty render
    //the items in the page
    }else{
      //'list' is the name of the file to render list.ejs
      resHome.render('list', {listTitle: "Today", itemsList: items});
    }
  });

});

// handler for custom route
app.get('/:customListName', (reqCustom, resCustom)=>{
  const listName = _.capitalize(reqCustom.params.customListName);
  //create a new list for the custom
  console.log(listName);
  List.findOne({name: listName}, (err, foundList)=>{
    if (!err){
      if (!foundList){
        const list = new List(
          {
            name: listName,
            items: defaultItems
          });
        list.save();
        resCustom.redirect("/" + listName);
      }else{
        //if the list is empty, fill it with the defaults
        if (foundList.items.length===0){
          //push the new item into the array of items
          foundList.items.push(item1, item2, item3);
          //save the list with the new item
          foundList.save();
        }
        resCustom.render('list', {listTitle: listName, itemsList: foundList.items});
      }
    }
  });
});




//handler for post route home
app.post('/', (reqHome, resHome)=>{
  //get the passsed value (Item) from the textbox input
  const newItem = _.capitalize(reqHome.body.newItem);
  //get the name of the list for item to be added
  const listName = reqHome.body.list;
  //create the item
  const item = new Item({name: newItem});
  //if the list name is the default
  //save the item and go the / route
  if (listName==="Today"){
    //save the item and go the / route
    item.save();
    resHome.redirect('/');
    //otherwise find the list
  }else{
    // find the list
    List.findOne({name: listName}, (err, foundList)=>{
      //push the new item into the array of items
      foundList.items.push(item);
      //save the list with the new item
      foundList.save();
      //go to the correct route
      resHome.redirect('/' + listName);
    });
  }


});

//handler for the post route delete
app.post('/delete', (reqDelete, resDelete)=>{
  //item to be deleted
  const itemToDelete=reqDelete.body.checkbox;
  //list that contains the item to be deleted
  const listUsed= reqDelete.body.listName;
  //if the list is the default
  if (listUsed === "Today"){
    Item.findByIdAndRemove(itemToDelete,(err)=>{
      if (!err){
        resDelete.redirect("/");
      }
    });
  // if the list is a custom list
  }else{
    //find the list to update since
    //it is a embedded collection
    List.findOneAndUpdate(
      {name: listUsed},//find by the name of the list
      // deletes from the array items the item with the
      //corresponding id
      {$pull:{items:{_id:itemToDelete}}},
      //function
      (err, results)=>{
        //if not errors
        //redirect to the list route in use
        if (!err){
          resDelete.redirect('/' + listUsed);
        }
      }
    );
  }
});


//express server
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port,() => console.log("Server is running on port " + port));
