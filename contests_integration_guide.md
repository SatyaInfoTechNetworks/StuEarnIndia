# StuEarn India — Android Contests & Competitions Integration Guide

> **Maintained By**: SatyaInfoTech Networks  
> **Target Package**: `com.thinkforgeapps.stuearnindia`  
> **API Version**: Express Contests v2.5 (Secured via JWT Bearer Token)  
> **Status**: Production Blueprint  

This document is the absolute blueprint for integrating the new **Dynamic Contests & Giveaways** feature on the Android Kotlin app. It includes the complete technical specs of the endpoints, Kotlin serializable data classes, Retrofit services, Repository patterns, ViewModels, and fully designed modern **Jetpack Compose UI Screens** using the app's designated style variables (e.g. `PrimaryTeal`, `PastelMint`, `SurfaceWhite`, `TextPrimary`, and standard `Resource<T>` wrapping).

---

## 🎯 1. Overview & Architectural Rules

To maximize user experience, AdMob compliance, and virality, the Kotlin application dynamically segments its screens and behavioral logic based on the `type` returned in the `/api/contests` REST response:

1. **Lucky Draw (`LUCKY_DRAW`)**:
   - **Mechanism**: Weighted ticket raffle. Users watch rewarded ads, claim a daily free ticket, or purchase tickets using coins.
   - **UI Requirement**: Shows ticket claims progress cards, remaining limits, AdMob video playbacks, and tickets purchase buttons.
2. **Referral Contest (`REFERRAL_CONTEST`)**:
   - **Mechanism**: Pure growth leaderboard. Users click a one-time "Join Contest" CTA, and referrals are counted strictly after joining.
   - **UI Requirement**: Hides all ticket counters/ad buttons. Renders a standings card showing `"Your Standing: Rank #X - Y Referrals"`, a live leaderboard, and a prominent **Invite Friends** CTA invoking system share sheets.
3. **Earnings Contest (`EARNINGS_CONTEST`)**:
   - **Mechanism**: Performance leaderboard. Users register once, and performance coins earned strictly after joining determine rank.
   - **UI Requirement**: Hides all ticket/ad elements. Renders a standings card showing `"Your Standing: Rank #X - Y Coins"`, next-rank progress meters, a live leaderboard, and an **"Earn More Now"** CTA block showing shortcuts to tasks and offerwalls.

---

## 🔑 2. API Endpoints Specification

### A. List Active & Upcoming Contests
* **Endpoint**: `GET /api/contests/active`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response (Success)**:
```json
{
  "success": true,
  "contests": [
    {
      "id": "c1f7a83d-e6fb-4081-9b16-aa971c26bdf1",
      "title": "Weekend Mega Earnings League",
      "description": "Compete with other users by completing tasks and offers this weekend. Top ranks win big!",
      "type": "EARNINGS_CONTEST",
      "startTime": "2026-05-29T00:00:00.000Z",
      "endTime": "2026-05-31T23:59:59.000Z",
      "maxEntriesPerDay": 0,
      "totalWinners": 5,
      "globalEntriesCount": 182,
      "myTickets": 1,
      "slug": "weekend-mega-earnings-league",
      "bannerImage": "",
      "prizeText": "₹5000 Prize Pool",
      "allowFreeEntry": false,
      "allowAdEntry": false,
      "maxAdEntriesPerDay": 0,
      "allowCoinsEntry": false,
      "ticketCoinsCost": 0,
      "maxTicketsPerUser": 1,
      "rewards": [
        { "position": 1, "type": "CASH", "value": 2500 }
      ]
    }
  ]
}
```

### B. Fetch Contest Detail & User Limits
* **Endpoint**: `GET /api/contests/:id`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response (Success)**:
```json
{
  "success": true,
  "contest": {
    "id": "c1f7a83d-e6fb-4081-9b16-aa971c26bdf1",
    "title": "Weekend Mega Earnings League",
    "description": "Compete with other users by completing tasks and offers this weekend. Top ranks win big!",
    "type": "EARNINGS_CONTEST",
    "startTime": "2026-05-29T00:00:00.000Z",
    "endTime": "2026-05-31T23:59:59.000Z",
    "status": "ACTIVE",
    "slug": "weekend-mega-earnings-league",
    "bannerImage": "",
    "prizeText": "₹5000 Prize Pool",
    "allowFreeEntry": false,
    "allowAdEntry": false,
    "maxAdEntriesPerDay": 0,
    "allowCoinsEntry": false,
    "ticketCoinsCost": 0.00,
    "maxTicketsPerUser": 1,
    "totalEntries": 182,
    "myTickets": 1,
    "entriesLeftToday": 0,
    "freeEntriesLeftToday": 0,
    "adEntriesLeftToday": 0,
    "overallEntriesLeft": 0,
    "myScore": 24500.00,
    "rewards": [
      { "position": 1, "type": "CASH", "value": 2500 }
    ]
  }
}
```

### C. Join/Enter Contest
* **Endpoint**: `POST /api/contests/:id/enter`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body (LUCKY_DRAW tickets)**:
```json
{
  "source": "AD"
}
```
* **Request Body (Competitive Join)**:
```json
{}
```
* **Response (Success)**:
```json
{
  "success": true,
  "message": "Successfully registered! Your referrals are now being actively tracked."
}
```

### D. Get Live Leaderboard Standings
* **Endpoint**: `GET /api/contests/:id/leaderboard`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response (Success)**:
```json
{
  "success": true,
  "leaderboard": [
    { "rank": 1, "userName": "Rahul Sharma", "score": "125 Referrals" },
    { "rank": 2, "userName": "Aryan Patel", "score": "101 Referrals" },
    { "rank": 3, "userName": "Devraj Devraj", "score": "89 Referrals" }
  ],
  "myStanding": {
    "rank": 12,
    "score": "23 Referrals"
  }
}
```

---

## 📦 3. Android Data Layer (Kotlin Models & DTOs)

Create a new file in your Android project at `com.thinkforgeapps.stuearnindia.data.model.ContestModels.kt` containing these definitions:

```kotlin
package com.thinkforgeapps.stuearnindia.data.model

import com.google.gson.annotations.SerializedName

// 1. Reward item DTO
data class ContestReward(
    @SerializedName("position") val position: Int,
    @SerializedName("type") val type: String, // COINS, CASH, GIFTCARD
    @SerializedName("value") val value: Double
)

// 2. Contest summarization DTO
data class Contest(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("type") val type: String, // LUCKY_DRAW, REFERRAL_CONTEST, EARNINGS_CONTEST
    @SerializedName("startTime") val startTime: String,
    @SerializedName("endTime") val endTime: String,
    @SerializedName("maxEntriesPerDay") val maxEntriesPerDay: Int,
    @SerializedName("totalWinners") val totalWinners: Int,
    @SerializedName("globalEntriesCount") val globalEntriesCount: Int,
    @SerializedName("myTickets") val myTickets: Int,
    @SerializedName("rewards") val rewards: List<ContestReward>,
    @SerializedName("prizeText") val prizeText: String?,
    @SerializedName("bannerImage") val bannerImage: String?
)

// 3. Detailed Contest details DTO
data class ContestDetail(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("type") val type: String,
    @SerializedName("startTime") val startTime: String,
    @SerializedName("endTime") val endTime: String,
    @SerializedName("maxEntriesPerDay") val maxEntriesPerDay: Int,
    @SerializedName("totalWinners") val totalWinners: Int,
    @SerializedName("status") val status: String, // ACTIVE, COMPLETED
    @SerializedName("totalEntries") val totalEntries: Int,
    @SerializedName("myTickets") val myTickets: Int,
    @SerializedName("entriesLeftToday") val entriesLeftToday: Int,
    @SerializedName("freeEntriesLeftToday") val freeEntriesLeftToday: Int,
    @SerializedName("adEntriesLeftToday") val adEntriesLeftToday: Int,
    @SerializedName("overallEntriesLeft") val overallEntriesLeft: Int,
    @SerializedName("allowFreeEntry") val allowFreeEntry: Boolean,
    @SerializedName("allowAdEntry") val allowAdEntry: Boolean,
    @SerializedName("allowCoinsEntry") val allowCoinsEntry: Boolean,
    @SerializedName("ticketCoinsCost") val ticketCoinsCost: Double,
    @SerializedName("maxTicketsPerUser") val maxTicketsPerUser: Int,
    @SerializedName("myScore") val myScore: Double,
    @SerializedName("rewards") val rewards: List<ContestReward>,
    @SerializedName("prizeText") val prizeText: String?,
    @SerializedName("bannerImage") val bannerImage: String?
)

// 4. Leaderboard standing item
data class LeaderboardItem(
    @SerializedName("rank") val rank: Int,
    @SerializedName("userName") val userName: String,
    @SerializedName("score") val score: String
)

// 5. Calling user standings
data class MyStanding(
    @SerializedName("rank") val rank: Int,
    @SerializedName("score") val score: String
)

// 6. Winner list items DTO
data class ContestWinner(
    @SerializedName("reward_position") val rewardPosition: Int,
    @SerializedName("reward_type") val rewardType: String,
    @SerializedName("reward_value") val rewardValue: Double,
    @SerializedName("selected_at") val selectedAt: String,
    @SerializedName("contest_title") val contestTitle: String,
    @SerializedName("user_name") val userName: String
)

// 7. API Envelopes
data class ActiveContestsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("contests") val contests: List<Contest>
)

data class ContestDetailResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("contest") val contest: ContestDetail
)

data class EnterContestRequest(
    @SerializedName("source") val source: String? = null
)

data class BaseContestResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String
)

data class ContestLeaderboardResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("leaderboard") val leaderboard: List<LeaderboardItem>,
    @SerializedName("myStanding") val myStanding: MyStanding
)

data class ContestWinnersResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("winners") val winners: List<ContestWinner>
)
```

---

## 📡 4. Retrofit API Service Interface

Create/Update `com.thinkforgeapps.stuearnindia.data.remote.ContestApiService.kt`:

```kotlin
package com.thinkforgeapps.stuearnindia.data.remote

import com.thinkforgeapps.stuearnindia.data.model.*
import retrofit2.http.*

interface ContestApiService {

    @GET("api/contests/active")
    suspend fun getActiveContests(
        @Header("Authorization") token: String
    ): ActiveContestsResponse

    @GET("api/contests/{id}")
    suspend fun getContestDetail(
        @Header("Authorization") token: String,
        @Path("id") contestId: String
    ): ContestDetailResponse

    @POST("api/contests/{id}/enter")
    suspend fun enterContest(
        @Header("Authorization") token: String,
        @Path("id") contestId: String,
        @Body request: EnterContestRequest
    ): BaseContestResponse

    @GET("api/contests/{id}/leaderboard")
    suspend fun getContestLeaderboard(
        @Header("Authorization") token: String,
        @Path("id") contestId: String
    ): ContestLeaderboardResponse

    @GET("api/contests/winners")
    suspend fun getContestWinners(): ContestWinnersResponse
}
```

---

## 🗃️ 5. Contests Repository Implementation

Create/Update `com.thinkforgeapps.stuearnindia.data.repository.ContestRepository.kt`:

```kotlin
package com.thinkforgeapps.stuearnindia.data.repository

import com.thinkforgeapps.stuearnindia.data.remote.ContestApiService
import com.thinkforgeapps.stuearnindia.data.model.*
import com.thinkforgeapps.stuearnindia.util.Resource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import retrofit2.HttpException
import java.io.IOException

class ContestRepository(private val apiService: ContestApiService) {

    fun getActiveContests(jwtToken: String): Flow<Resource<List<Contest>>> = flow {
        emit(Resource.Loading())
        try {
            val response = apiService.getActiveContests("Bearer $jwtToken")
            if (response.success) {
                emit(Resource.Success(response.contests))
            } else {
                emit(Resource.Error("Failed to fetch contests"))
            }
        } catch (e: HttpException) {
            emit(Resource.Error(e.localizedMessage ?: "An unexpected HTTP error occurred"))
        } catch (e: IOException) {
            emit(Resource.Error("Couldn't reach server. Check your connection."))
        }
    }

    fun getContestDetail(jwtToken: String, id: String): Flow<Resource<ContestDetail>> = flow {
        emit(Resource.Loading())
        try {
            val response = apiService.getContestDetail("Bearer $jwtToken", id)
            if (response.success) {
                emit(Resource.Success(response.contest))
            } else {
                emit(Resource.Error("Failed to load details"))
            }
        } catch (e: HttpException) {
            emit(Resource.Error(e.localizedMessage ?: "HTTP Error"))
        } catch (e: IOException) {
            emit(Resource.Error("No internet connection"))
        }
    }

    fun getContestLeaderboard(jwtToken: String, id: String): Flow<Resource<ContestLeaderboardResponse>> = flow {
        emit(Resource.Loading())
        try {
            val response = apiService.getContestLeaderboard("Bearer $jwtToken", id)
            if (response.success) {
                emit(Resource.Success(response))
            } else {
                emit(Resource.Error("Failed to load leaderboard standings"))
            }
        } catch (e: HttpException) {
            emit(Resource.Error(e.localizedMessage ?: "HTTP Error"))
        } catch (e: IOException) {
            emit(Resource.Error("No internet connection"))
        }
    }

    suspend fun enterContest(jwtToken: String, id: String, source: String?): Resource<String> {
        return try {
            val response = apiService.enterContest(
                "Bearer $jwtToken", 
                id, 
                EnterContestRequest(source)
            )
            if (response.success) {
                Resource.Success(response.message)
            } else {
                Resource.Error(response.message)
            }
        } catch (e: HttpException) {
            val errorMsg = e.response()?.errorBody()?.string()?.let { body ->
                try {
                    val json = com.google.gson.JsonParser.parseString(body).asJsonObject
                    json.get("message").asString
                } catch (ex: Exception) { null }
            } ?: e.message()
            Resource.Error(errorMsg)
        } catch (e: IOException) {
            Resource.Error("Network error. Please try again.")
        }
    }

    fun getContestWinners(): Flow<Resource<List<ContestWinner>>> = flow {
        emit(Resource.Loading())
        try {
            val response = apiService.getContestWinners()
            if (response.success) {
                emit(Resource.Success(response.winners))
            } else {
                emit(Resource.Error("Failed to load scoreboard"))
            }
        } catch (e: HttpException) {
            emit(Resource.Error(e.localizedMessage ?: "HTTP error"))
        } catch (e: IOException) {
            emit(Resource.Error("No internet connection"))
        }
    }
}
```

---

## 🧠 6. Stateful View ViewModel Implementation

Create/Update `com.thinkforgeapps.stuearnindia.ui.screens.home.ContestViewModel.kt`:

```kotlin
package com.thinkforgeapps.stuearnindia.ui.screens.home

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.thinkforgeapps.stuearnindia.data.model.*
import com.thinkforgeapps.stuearnindia.data.repository.ContestRepository
import com.thinkforgeapps.stuearnindia.util.Resource
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ContestViewModel(
    private val repository: ContestRepository,
    private val jwtToken: String
) : ViewModel() {

    private val _contestsState = MutableStateFlow<Resource<List<Contest>>>(Resource.Loading())
    val contestsState: StateFlow<Resource<List<Contest>>> = _contestsState.asStateFlow()

    private val _detailState = MutableStateFlow<Resource<ContestDetail>>(Resource.Loading())
    val detailState: StateFlow<Resource<ContestDetail>> = _detailState.asStateFlow()

    private val _leaderboardState = MutableStateFlow<Resource<ContestLeaderboardResponse>>(Resource.Loading())
    val leaderboardState: StateFlow<Resource<ContestLeaderboardResponse>> = _leaderboardState.asStateFlow()

    private val _winnersState = MutableStateFlow<Resource<List<ContestWinner>>>(Resource.Loading())
    val winnersState: StateFlow<Resource<List<ContestWinner>>> = _winnersState.asStateFlow()

    private val _entryStatus = MutableSharedFlow<Resource<String>>()
    val entryStatus: SharedFlow<Resource<String>> = _entryStatus.asSharedFlow()

    fun loadActiveContests() {
        viewModelScope.launch {
            repository.getActiveContests(jwtToken).collect {
                _contestsState.value = it
            }
        }
    }

    fun loadContestDetail(contestId: String) {
        viewModelScope.launch {
            repository.getContestDetail(jwtToken, contestId).collect {
                _detailState.value = it
            }
        }
    }

    fun loadContestLeaderboard(contestId: String) {
        viewModelScope.launch {
            repository.getContestLeaderboard(jwtToken, contestId).collect {
                _leaderboardState.value = it
            }
        }
    }

    fun loadWinnersFeed() {
        viewModelScope.launch {
            repository.getContestWinners().collect {
                _winnersState.value = it
            }
        }
    }

    fun joinOrRegisterContest(context: Context, contestId: String, source: String? = null) {
        viewModelScope.launch {
            _entryStatus.emit(Resource.Loading())
            val result = repository.enterContest(jwtToken, contestId, source)
            _entryStatus.emit(result)
            if (result is Resource.Success) {
                loadContestDetail(contestId)
                loadContestLeaderboard(contestId)
                loadActiveContests()
            }
        }
    }

    class Factory(
        private val repository: ContestRepository,
        private val jwtToken: String
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(ContestViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return ContestViewModel(repository, jwtToken) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
```

---

## 🎨 7. Segregated Premium Jetpack Compose UIs

Renders dynamic interfaces based strictly on the contest `type`!

### A. Dynamic Detail Screen Switcher (`ContestDetailScreen.kt`)
This handles the routing and live updates for the specific user actions.

```kotlin
package com.thinkforgeapps.stuearnindia.ui.screens.home

import android.app.Activity
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Launch
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.thinkforgeapps.stuearnindia.data.model.*
import com.thinkforgeapps.stuearnindia.ui.theme.*
import com.thinkforgeapps.stuearnindia.util.AdMobManager
import com.thinkforgeapps.stuearnindia.util.Resource
import kotlinx.coroutines.flow.collectLatest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContestDetailScreen(
    navController: NavController,
    viewModel: ContestViewModel,
    contestId: String
) {
    val detailState by viewModel.detailState.collectAsState()
    val leaderboardState by viewModel.leaderboardState.collectAsState()
    val entryStatus by viewModel.entryStatus.collectAsState(initial = null)
    
    val context = LocalContext.current
    var isSubmitting by remember { mutableStateOf(false) }

    LaunchedEffect(contestId) {
        viewModel.loadContestDetail(contestId)
        viewModel.loadContestLeaderboard(contestId)
        AdMobManager.loadStreakRewardedAd(context)
    }

    LaunchedEffect(entryStatus) {
        if (entryStatus != null) {
            when (entryStatus) {
                is Resource.Success -> {
                    isSubmitting = false
                    Toast.makeText(context, entryStatus!!.data ?: "Registration success!", Toast.LENGTH_LONG).show()
                }
                is Resource.Error -> {
                    isSubmitting = false
                    Toast.makeText(context, entryStatus!!.message ?: "Failed to enter", Toast.LENGTH_LONG).show()
                }
                is Resource.Loading -> {
                    isSubmitting = true
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Contest Arena", fontWeight = FontWeight.Bold, color = TextPrimary) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SurfaceWhite)
            )
        },
        containerColor = BackgroundLight
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (detailState) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = PrimaryTeal)
                    }
                }
                is Resource.Error -> {
                    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text(detailState.message ?: "Network error occurred")
                    }
                }
                is Resource.Success -> {
                    val detail = detailState.data ?: return@Box
                    val leaderboard = (leaderboardState as? Resource.Success)?.data

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp)
                    ) {
                        // Switch layouts dynamically based on types
                        when (detail.type) {
                            "LUCKY_DRAW" -> LuckyDrawLayout(detail, isSubmitting, viewModel)
                            "REFERRAL_CONTEST" -> ReferralContestLayout(detail, isSubmitting, leaderboard, viewModel)
                            "EARNINGS_CONTEST" -> EarningsContestLayout(detail, isSubmitting, leaderboard, viewModel)
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                        PrizesSection(detail.rewards)
                    }
                }
            }
        }
    }
}
```

---

### B. 🎟️ Segregated Lucky Draw Layout (Raffle Ticket Interface)
```kotlin
@Composable
fun LuckyDrawLayout(
    detail: ContestDetail,
    isSubmitting: Boolean,
    viewModel: ContestViewModel
) {
    val context = LocalContext.current
    val activity = context as? Activity

    // Hero Ticket Card
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(24.dp)),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(PastelMint, Color.White), startY = 0f, endY = 300f))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.ConfirmationNumber, contentDescription = "Tickets", tint = PrimaryTeal, modifier = Modifier.size(56.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text("My Raffle Tickets", fontSize = 13.sp, color = TextSecondary)
            Text("${detail.myTickets} Tickets", fontSize = 32.sp, fontWeight = FontWeight.Black, color = PrimaryTeal)
            Spacer(modifier = Modifier.height(4.dp))
            val percent = detail.myTickets.toFloat() / detail.maxTicketsPerUser.toFloat()
            LinearProgressIndicator(progress = percent, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)), color = PrimaryTeal, trackColor = DividerColor)
            Spacer(modifier = Modifier.height(4.dp))
            Text("Tickets cap left today: ${detail.entriesLeftToday}", color = TextSecondary, fontSize = 11.sp)
        }
    }

    Spacer(modifier = Modifier.height(20.dp))

    // Ticket Actions Block
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        border = BorderStroke(1.dp, DividerColor),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Ticket Acquisition Options", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(12.dp))

            // Option 1: Watch Rewarded Ads
            if (detail.allowAdEntry) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Watch Video Ad", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Text("${detail.adEntriesLeftToday} remaining today", color = TextSecondary, fontSize = 11.sp)
                    }
                    Button(
                        onClick = {
                            if (activity != null && AdMobManager.isStreakRewardedAdLoaded()) {
                                AdMobManager.showStreakRewardedAd(activity, onUserEarnedReward = {
                                    viewModel.joinOrRegisterContest(context, detail.id, "AD")
                                })
                            } else {
                                Toast.makeText(context, "Ad loading... try again!", Toast.LENGTH_SHORT).show()
                                AdMobManager.loadStreakRewardedAd(context)
                            }
                        },
                        enabled = !isSubmitting && detail.adEntriesLeftToday > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = "Play", modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Watch Ad")
                    }
                }
                Divider(modifier = Modifier.padding(vertical = 12.dp), color = DividerColor)
            }

            // Option 2: Coins Purchase
            if (detail.allowCoinsEntry) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Buy Ticket", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Text("Costs ${detail.ticketCoinsCost.toInt()} coins", color = TextSecondary, fontSize = 11.sp)
                    }
                    Button(
                        onClick = { viewModel.joinOrRegisterContest(context, detail.id, "COINS") },
                        enabled = !isSubmitting && detail.overallEntriesLeft > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = ActionDeepOrange)
                    ) {
                        Text("Buy Ticket")
                    }
                }
                Divider(modifier = Modifier.padding(vertical = 12.dp), color = DividerColor)
            }

            // Option 3: Daily Free Ticket
            if (detail.allowFreeEntry) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Daily Free Ticket Check-in", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Button(
                        onClick = { viewModel.joinOrRegisterContest(context, detail.id, "FREE") },
                        enabled = !isSubmitting && detail.freeEntriesLeftToday > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal)
                    ) {
                        Text(if (detail.freeEntriesLeftToday > 0) "Claim" else "Claimed")
                    }
                }
            }
        }
    }
}
```

---

### C. 👥 Segregated Referral Contest Layout (Dashboard & Leaderboard)
```kotlin
@Composable
fun ReferralContestLayout(
    detail: ContestDetail,
    isSubmitting: Boolean,
    leaderboard: ContestLeaderboardResponse?,
    viewModel: ContestViewModel
) {
    val context = LocalContext.current
    val hasJoined = detail.myTickets > 0

    // Standing Card
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(24.dp)),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(PastelMint, Color.White), startY = 0f, endY = 300f))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.EmojiEvents, contentDescription = "Trophy", tint = PrimaryTeal, modifier = Modifier.size(56.dp))
            Spacer(modifier = Modifier.height(8.dp))
            
            if (hasJoined) {
                Text("Your referral standings", fontSize = 13.sp, color = TextSecondary)
                Text("#${leaderboard?.myStanding?.rank ?: "—"}", fontSize = 32.sp, fontWeight = FontWeight.Black, color = PrimaryTeal)
                Text("${detail.myScore.toInt()} valid referrals after joining", color = TextSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.TrendingUp, contentDescription = "Standings", tint = PrimaryTeal, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Rank climbed +3 today", color = PrimaryTeal, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Text("Contest Live! Join to compete", fontSize = 13.sp, color = TextSecondary)
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { viewModel.joinOrRegisterContest(context, detail.id) },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Join Referral Contest Now", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (hasJoined) {
        Spacer(modifier = Modifier.height(20.dp))
        
        // Share CTA Card
        Button(
            onClick = {
                // Share Sheet Trigger
                val shareIntent = android.content.Intent().apply {
                    action = android.content.Intent.ACTION_SEND
                    putExtra(android.content.Intent.EXTRA_TEXT, "Hey! Join StuEarn using my link and get bonuses: https://stuearn.in/share")
                    type = "text/plain"
                }
                context.startActivity(android.content.Intent.createChooser(shareIntent, "Invite Friends"))
            },
            modifier = Modifier.fillMaxWidth().height(56.dp).shadow(4.dp, RoundedCornerShape(28.dp)),
            colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal),
            shape = RoundedCornerShape(28.dp)
        ) {
            Icon(Icons.Default.Share, contentDescription = "Share", tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Invite Friends Now", fontWeight = FontWeight.Bold, color = Color.White)
        }

        Spacer(modifier = Modifier.height(24.dp))
        LeaderboardView(leaderboard?.leaderboard ?: emptyList())
    }
}
```

---

### D. 💰 Segregated Earnings Contest Layout (Performance Arena)
```kotlin
@Composable
fun EarningsContestLayout(
    detail: ContestDetail,
    isSubmitting: Boolean,
    leaderboard: ContestLeaderboardResponse?,
    viewModel: ContestViewModel
) {
    val context = LocalContext.current
    val hasJoined = detail.myTickets > 0

    // Standing Card
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(24.dp)),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(PastelMint, Color.White), startY = 0f, endY = 300f))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.TrendingUp, contentDescription = "Earnings", tint = PrimaryTeal, modifier = Modifier.size(56.dp))
            Spacer(modifier = Modifier.height(8.dp))
            
            if (hasJoined) {
                Text("Your Earnings standings", fontSize = 13.sp, color = TextSecondary)
                Text("#${leaderboard?.myStanding?.rank ?: "—"}", fontSize = 32.sp, fontWeight = FontWeight.Black, color = PrimaryTeal)
                Text("${detail.myScore.toInt()} Coins earned after joining", color = TextSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(4.dp))
                
                // Progress bar indicating goal to reach next rank
                val neededScore = (leaderboard?.leaderboard?.firstOrNull()?.score?.replace(" Coins", "")?.toDoubleOrNull() ?: 100000.0)
                val percentProgress = if (neededScore > 0) (detail.myScore / neededScore).toFloat().coerceIn(0f, 1f) else 0f
                LinearProgressIndicator(progress = percentProgress, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)), color = PrimaryTeal, trackColor = DividerColor)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Climbing towards Rank #1!", color = TextSecondary, fontSize = 11.sp)
            } else {
                Text("Earnings League is Live! Join to win cash", fontSize = 13.sp, color = TextSecondary)
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { viewModel.joinOrRegisterContest(context, detail.id) },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Text("Join Earnings League Now", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (hasJoined) {
        Spacer(modifier = Modifier.height(20.dp))
        
        // Earn shortcuts CTA block
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
            border = BorderStroke(1.dp, DividerColor),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("🚀 Earn More & Climb Rankings!", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth().clickable { /* Route to Offerwall */ }.padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Open App Offerwall", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Icon(Icons.Default.Launch, contentDescription = "Open", tint = PrimaryTeal, modifier = Modifier.size(16.dp))
                }
                Divider(color = DividerColor)
                Row(modifier = Modifier.fillMaxWidth().clickable { /* Route to Ads */ }.padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Watch Premium Video Ads", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Icon(Icons.Default.Launch, contentDescription = "Open", tint = PrimaryTeal, modifier = Modifier.size(16.dp))
                }
                Divider(color = DividerColor)
                Row(modifier = Modifier.fillMaxWidth().clickable { /* Route to Tasks */ }.padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Complete Easy micro-tasks", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Icon(Icons.Default.Launch, contentDescription = "Open", tint = PrimaryTeal, modifier = Modifier.size(16.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        LeaderboardView(leaderboard?.leaderboard ?: emptyList())
    }
}
```

---

### E. 🥇 Shareable Leaderboard Component
```kotlin
@Composable
fun LeaderboardView(items: List<LeaderboardItem>) {
    Text("🏆 Standings Leaderboard", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
    Spacer(modifier = Modifier.height(10.dp))
    
    if (items.isEmpty()) {
        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = SurfaceWhite), shape = RoundedCornerShape(16.dp)) {
            Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Text("Rankings loading or empty. Be the first to secure a spot!", color = TextSecondary, fontSize = 12.sp)
            }
        }
    } else {
        items.forEach { item ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                border = BorderStroke(1.dp, DividerColor)
            ) {
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (item.rank <= 3) PastelMint else DividerColor),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = when(item.rank) {
                                    1 -> "🥇"
                                    2 -> "🥈"
                                    3 -> "🥉"
                                    else -> "#${item.rank}"
                                },
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                color = PrimaryTeal
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(item.userName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                    }
                    Text(item.score, fontWeight = FontWeight.Black, fontSize = 13.sp, color = PrimaryTeal)
                }
            }
        }
    }
}
```

---

### F. 🎁 Dynamic Prizes Section
```kotlin
@Composable
fun PrizesSection(rewards: List<ContestReward>) {
    Text("🏆 Tiered Positions Prizes", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
    Spacer(modifier = Modifier.height(10.dp))
    
    rewards.forEach { reward ->
        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
            border = BorderStroke(1.dp, DividerColor)
        ) {
            Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Position #${reward.position}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text(
                    text = when (reward.type) {
                        "COINS" -> "${reward.value.toInt()} Coins"
                        "CASH" -> "₹${reward.value.toInt()} UPI"
                        else -> "₹${reward.value.toInt()} Gift Card"
                    },
                    fontWeight = FontWeight.Black,
                    color = PrimaryTeal,
                    fontSize = 13.sp
                )
            }
        }
    }
}
```

---

## 🚀 8. Assembly & Deep Linking Guidelines

1. **Retrofit Configuration**:
   Register `ContestApiService` inside your main injection module or Retrofit client initializer, e.g. `retrofit.create(ContestApiService::class.java)`.
2. **ViewModel Creation**:
   Initialize your `ContestViewModel` inside `HomeScreen.kt` or when navigating to the contests stack. Pass in the logged-in user's JWT token fetched during authentication.
3. **Ad Setup Compliance**:
   Ensure `AdMobManager.loadStreakRewardedAd(context)` is called during loading screen triggers so that by the time the user clicks to earn a raffle ticket, the interstitial rewarded ad is cached in memory.
4. **Deep Linking**:
   Register `stuearn://contests` and `stuearn://contests/:id` in your navigation controller or AndroidManifest scheme lists to enable push/in-app navigation support!
