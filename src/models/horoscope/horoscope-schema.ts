import mongoose from "mongoose";

const horoscopeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  zodiacSign: {
    type: String,  
    required: true,
  },
  sunSign: {
    type: String,  
    required: true,
  },
  moonSign: {
    type: String,  
    required: true,
  },
  risingStar: {
    type: String,  
    required: true,
  },
   ascendantDegree:{
      type: Number,
      default: null
    },
    midheavenDegree:{
      type: Number,
      default: null
    },
    vertex:{
      type: Number,
      default: null
    },
    planetsData:{
      type: Object,
      default: null
    },
    housesData:{
      type: Object,
      default: null
    },
    aspectsData:{
      type: Object,
      default: null
    },
    lilith:{
      type: Object,
      default: null
    },
    personalityKeywords:[
      {
        type: String, 
      }
    ],
    name:{
      type: String,
      required: true,
    },
    dob:{
      type:String,
      required:true,
    },
    timeOfBirth:{
      type:String,
      default:null
    },
    placeOfBirth:{
      type:String,
      required:true,
    },
    gender:{
      type: String,
      required: true
    }

},{
  timestamps: true
});

export const HoroscopeModel = mongoose.model("horoscope", horoscopeSchema);
