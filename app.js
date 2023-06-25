const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const debug = require('debug')('app');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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
      debug(items);
      if (items.length == 0) {
        Item.insertMany(defaultItems)
          .then(() => {
            debug("Successfully saved items to the database");
          })
          .catch((err) => {
            if (err && err.writeErrors && err.writeErrors.length > 0) {
              debug("Write errors occurred:");
              debug(err.writeErrors);
            } else {
              debug(err);
            }
          });
        res.redirect("/");
      } else {
        res.render("list", { listTitle: "Today", newListItems: items });
      }
    })
    .catch((err) => {
      debug(err);
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
      debug("List already exists!");
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    debug(err);
    res.status(500).send("Error occurred");
  }
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listname = req.body.list;
  
  const item = new Item({
    name: itemName
  });

  debug("Item Name:", itemName);
  debug("List Name:", listname);

  if (listname === "Today") {
    item.save()
      .then(() => {
        debug("Item saved:", item);
        res.redirect("/");
      })
      .catch((err) => {
        debug("Error saving item:", err);
      });
  } else {
    List.findOne({ name: listname })
      .then((foundList) => {
        debug("Found List:", foundList);
        foundList.items.push(item);
        foundList.save()
          .then(() => {
            debug("Item added to list:", item);
            res.redirect("/" + listname);
          })
          .catch((err) => {
            debug("Error saving list:", err);
          });
      })
      .catch((err) => {
        debug("Error finding list:", err);
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
          debug("Successfully deleted item:", result);
          res.redirect("/");
        } else {
          debug("Item not found.");
          res.status(404).send("Item not found.");
        }
      })
      .catch(err => {
        debug(err);
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
        debug("Error updating list:", err);
        res.status(500).send("Error updating list");
      });
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  debug("Server started successfully");
});
