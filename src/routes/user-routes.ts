import { Router } from "express";
import {
  buyAgain,
  buyPlan,
  getLoginResponse,
  getPlans,
  logoutUser,
  setupIntent,
  userMoreInfo,
} from "src/controllers/auth/auth-controller";
import { generateHoroscope } from "src/controllers/horoscope/horoscope-controller";
import { userHome } from "src/controllers/user/home-controller";
import {
  changePassword,
  checkJournalEncryptionPassword,
  createJournal,
  createOrUpdateMood,
  createSupportRequest,
  deleteAccount,
  deleteJournalById,
  generateCompatibilityController,
  getAllDailyReflections,
  getAllUserCompatibility,
  getChatHistory,
  getCompatibilityById,
  getDailyReflection,
  getDailyReflectionById,
  getJournalById,
  getJournalByUserId,
  getMoodByUserId,
  getPlatformInfo,
  getSubscription,
  getSupportRequests,
  getUser,
  streamChatWithGPT,
  toggleJournalEncryption,
  updateDailyReflection,
  updateJournal,
  updateSubscription,
  updateUser,
  userProfile,
} from "src/controllers/user/profile-controller";

// Code
const router = Router();

router.post("/user-more-info", userMoreInfo);
router.get("/setup-intent", setupIntent);
router.route("/plans").get(getPlans).post(buyPlan);
router.get("/get-login-response", getLoginResponse);
router.post("/logout", logoutUser);
router.post("/buy-again", buyAgain);
router.get("/get-user", getUser);

const paidRouter = Router();

// HOME
paidRouter.get("/home", userHome);

// PROFILE
paidRouter.get("/profile", userProfile);
paidRouter.get("/daily-reflection", getDailyReflection);
paidRouter.route("/daily-reflection/:id").get(getDailyReflectionById).put(updateDailyReflection);
paidRouter.get("/user/daily-reflection", getAllDailyReflections);
paidRouter.route("/journal").post(createJournal).get(getJournalByUserId);
paidRouter.route("/journal/:id").put(updateJournal).get(getJournalById).delete(deleteJournalById);
paidRouter.patch("/update-user", updateUser);
paidRouter.route("/toggle/journal-encryption").post(toggleJournalEncryption).get(checkJournalEncryptionPassword);
paidRouter.patch("/change-password", changePassword);
paidRouter.post("/generate-horoscope", generateHoroscope);
paidRouter.route("/mood").post(createOrUpdateMood).get(getMoodByUserId);
paidRouter.route("/chat-gpt").post(streamChatWithGPT).get(getChatHistory);
paidRouter.route("/compatibility").post(generateCompatibilityController).get(getAllUserCompatibility)
paidRouter.get("/compatibility/:id",getCompatibilityById)
paidRouter.route("/support").post(createSupportRequest).get(getSupportRequests)
// paidRouter.patch("/change-language", changeLanguage);
// paidRouter.patch("/change-country", changeCountry);
paidRouter.get("/subscription",getSubscription)
paidRouter.get("/get-platform-info", getPlatformInfo);
// paidRouter
//   .route("/notification-setting")
//   .get(getNotificationSetting)
//   .patch(postNotificationSetting);
paidRouter.post("/delete-account", deleteAccount);
paidRouter.post("/update-subscription", updateSubscription);

//============================== ADMIN Routes
export { router, paidRouter };
