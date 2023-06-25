//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


// mongoose.connect("mongodb+srv://Tron:jTzHQOHJQ0UalnSR@cluster0.wh2ictk.mongodb.net/?retryWrites=true&w=majority/todolistDB");
mongoose.connect("mongodb+srv://Tron:jTzHQOHJQ0UalnSR@cluster0.wh2ictk.mongodb.net/todolistDB?retryWrites=true&w=majority");

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});
const item2 = new Item({
  name: "Hit the + button to add a new item to the todolist!"
});
const item3 = new Item({
  name: "Click this to delete an item from the todolist!"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
  Item.find({})
    .then((items) => {
      console.log(items);
      if (items.length == 0) {
        Item.insertMany(defaultItems)
          .then(() => {
            console.log("Successfully saved items to the database");
          })
          .catch((err) => {
            if (err && err.writeErrors && err.writeErrors.length > 0) {
              console.log("Write errors occurred:");
              console.log(err.writeErrors);
            } else {
              console.log(err);
            }
          });
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItems: items });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/:customlistname", async function(req, res) {
  const customlistname = _.capitalize(req.params.customlistname);
  
  try {
    const foundList = await List.findOne({ name: customlistname });
    if (!foundList) {
      const list = new List({
        name: customlistname,
        items: defaultItems
      });
      await list.save();
      res.redirect("/" + customlistname); // Redirect to the newly created list
    } else {
      console.log("List already exists!");
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred");
  }
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listname = req.body.list;
  
  const item = new Item({
    name: itemName
  });

  console.log("Item Name:", itemName);
  console.log("List Name:", listname);

  if (listname === "Today") {
    item.save()
      .then(() => {
        console.log("Item saved:", item);
        res.redirect("/");
      })
      .catch((err) => {
        console.error("Error saving item:", err);
      });
  } else {
    List.findOne({ name: listname })
      .then((foundList) => {
        console.log("Found List:", foundList);
        foundList.items.push(item);
        foundList.save()
          .then(() => {
            console.log("Item added to list:", item);
            res.redirect("/" + listname);
          })
          .catch((err) => {
            console.error("Error saving list:", err);
          });
      })
      .catch((err) => {
        console.error("Error finding list:", err);
      });
  }
});

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listname = req.body.listname;

  if (listname === "Today") {
    Item.findByIdAndRemove(checkedItemId)
      .then(result => {
        if (result) {
          console.log("Successfully deleted item:", result);
          res.redirect("/");
        } else {
          console.log("Item not found.");
          res.status(404).send("Item not found.");
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).send("Error deleting item");
      });
  } else {
    List.findOneAndUpdate(
      { name: listname },
      { $pull: { items: { _id: checkedItemId } } }
    )
      .then(() => {
        res.redirect("/" + listname);
      })
      .catch(err => {
        console.error("Error updating list:", err);
        res.status(500).send("Error updating list");
      });
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);

app.listen(3000, function () {
  console.log("Server started Succesfully");
});
