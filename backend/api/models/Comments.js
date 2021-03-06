// model Comment
const mongoose = require('mongoose'),
      ObjectId = mongoose.Schema.Types.ObjectId

const Schema = new mongoose.Schema({
  wagoID: { type: String, ref: 'WagoItem', index: true },
  authorID: { type: ObjectId, ref: 'Users', index: true},
  commentText: {type: String, index: 'text'},
  postDate: { type: Date, default: +new Date() },
  usersTagged: [{
    _id: false,
    userID: { type: ObjectId, ref: 'Users', index: true},
    read: {type: Boolean, default: false}
  }]
})

Schema.statics.findUnread = async function(userID) {
  return this.find({usersTagged: {$elemMatch: {userID: userID, read: false}}}).select('wagoID').exec()
}

Schema.statics.findMentions = async function(userID) {
  const comments = await this.find({"usersTagged.userID": userID}).select('wagoID usersTagged.$').exec()
  var mentions = {}
  comments.forEach((mention) => {
    mention.usersTagged.forEach((tag) => {
      if (tag.userID.equals(userID) && !tag.read) {
        mentions[mention.wagoID] = 1
      }
      else if (tag.userID.equals(userID) && !mentions[mention.wagoID]) {
        mentions[mention.wagoID] = 0
      }
    })    
  })
  return mentions
}

const Comments = mongoose.model('Comments', Schema)
module.exports = Comments