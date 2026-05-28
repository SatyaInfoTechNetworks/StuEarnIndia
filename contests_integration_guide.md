# StuEarn India — Android Contests & Giveaways Integration Guide

> **Maintained By**: SatyaInfoTech Networks  
> **Target Package**: `com.thinkforgeapps.stuearnindia`  
> **API Version**: Express Contests v1 (Secured via JWT Bearer Token)

This document is the absolute blueprint for integrating the new **Contests & Giveaways** feature on the Android Kotlin app. It includes the complete technical specs of the endpoints, Kotlin serializable data classes, Retrofit services, Repository patterns, ViewModels, and fully designed modern **Jetpack Compose UI Screens** using the app's designated style variables (e.g. `PrimaryTeal`, `PastelMint`, `SurfaceWhite`, `TextPrimary`, and standard `Resource<T>` wrapping).

---

## 🎯 1. Overview & AdMob Compliance Rules

To maintain strict Google AdMob compliance, the following nomenclature and architecture guidelines must be strictly enforced on the Android client:
1. **No Gambling Terminology**: Never use words like *"Betting"*, *"Gambling"*, *"Casino"*, or *"Wager"*.
2. **Promotional Loyalty Branding**: Label contests as **"Promotional Event"**, **"Community Giveaway"**, or **"Engagement Draw"**.
3. **Raffle Tickets**: Users do not buy tickets with balance. They earn **"Raffle Tickets"** (max 3 per day per contest) by engaging with Rewarded Ads.
4. **Automatic Ledger Settlement**: Balance/Coins are automatically deposited by the backend to their ledger wallet with safe transaction references.

---

## 🔑 2. API Endpoints Specification

### A. List Active & Upcoming Contests
Fetch all currently active contests, along with details on how many raffle tickets the calling user has logged globally.
* **Endpoint**: `GET /api/contests/active`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response (Success)**:
```json
{
  "success": true,
  "contests": [
    {
      "id": "78a87612-4fb2-475f-b51c-a9a7c36ad2e1",
      "title": "Daily Coins Lucky Raffle Draw",
      "description": "Watch rewarding video ads, earn raffle tickets, and get added to our daily lucky draw!",
      "type": "LUCKY_DRAW",
      "startTime": "2026-05-28T07:00:00.000Z",
      "endTime": "2026-05-28T23:59:00.000Z",
      "maxEntriesPerDay": 3,
      "totalWinners": 10,
      "globalEntriesCount": 142,
      "myTickets": 1,
      "rewards": [
        { "position": 1, "type": "COINS", "value": 500.00 },
        { "position": 2, "type": "COINS", "value": 250.00 },
        { "position": 3, "type": "COINS", "value": 100.00 }
      ]
    }
  ]
}
```

---

### B. Fetch Contest Detail & Daily Limits
Fetch details of a specific contest, including the number of remaining daily entries permitted for the user.
* **Endpoint**: `GET /api/contests/:id`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response (Success)**:
```json
{
  "success": true,
  "contest": {
    "id": "78a87612-4fb2-475f-b51c-a9a7c36ad2e1",
    "title": "Daily Coins Lucky Raffle Draw",
    "description": "Watch rewarding video ads, earn raffle tickets, and get added to our daily lucky draw!",
    "type": "LUCKY_DRAW",
    "startTime": "2026-05-28T07:00:00.000Z",
    "endTime": "2026-05-28T23:59:00.000Z",
    "maxEntriesPerDay": 3,
    "totalWinners": 10,
    "status": "ACTIVE",
    "totalEntries": 142,
    "myTickets": 1,
    "entriesLeftToday": 2,
    "rewards": [
      { "position": 1, "type": "COINS", "value": 500.00 },
      { "position": 2, "type": "COINS", "value": 250.00 },
      { "position": 3, "type": "COINS", "value": 100.00 }
    ]
  }
}
```

---

### C. Log/Earn Contest Raffle Ticket
Register one ticket completion inside the contest. Safe-locks on the server to prevent duplicates.
* **Endpoint**: `POST /api/contests/:id/enter`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "source": "AD"
}
```
* **Response (Success)**:
```json
{
  "success": true,
  "message": "Congratulations! You earned 1 raffle ticket."
}
```
* **Response (Error — Limit Reached or Inactive)**:
```json
{
  "success": false,
  "message": "Daily entry limit reached. You can only earn up to 3 tickets per day."
}
```

---

### D. Get Historical Global Contest Winners Feed
Get a list of completed contest winners to display as a scoreboard feed in the app.
* **Endpoint**: `GET /api/contests/winners`
* **Headers**: None required (public feed)
* **Response (Success)**:
```json
{
  "success": true,
  "winners": [
    {
      "reward_position": 1,
      "reward_type": "COINS",
      "reward_value": 500.00,
      "selected_at": "2026-05-27T23:59:59.000Z",
      "contest_title": "Daily Coins Lucky Raffle Draw",
      "user_name": "Devraj Devraj"
    }
  ]
}
```

---

## 📦 3. Android Data Layer (Kotlin Models & DTOs)

Create a new file in your Android project at `com.thinkforgeapps.stuearnindia.data.model.ContestModels.kt` containing these definitions:

```kotlin
package com.thinkforgeapps.stuearnindia.data.model

import com.google.gson.annotations.SerializedName

// 1. Contest Reward Structure
data class ContestReward(
    @SerializedName("position") val position: Int,
    @SerializedName("type") val type: String, // COINS, CASH, GIFTCARD
    @SerializedName("value") val value: Double
)

// 2. Main Contest Object
data class Contest(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("type") val type: String, // LUCKY_DRAW, REFERRAL, EARNINGS
    @SerializedName("startTime") val startTime: String,
    @SerializedName("endTime") val endTime: String,
    @SerializedName("maxEntriesPerDay") val maxEntriesPerDay: Int,
    @SerializedName("totalWinners") val totalWinners: Int,
    @SerializedName("globalEntriesCount") val globalEntriesCount: Int,
    @SerializedName("myTickets") val myTickets: Int,
    @SerializedName("rewards") val rewards: List<ContestReward>
)

// 3. Single Contest Detail (includes status and today's limit left)
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
    @SerializedName("rewards") val rewards: List<ContestReward>
)

// 4. Historical Winner Object
data class ContestWinner(
    @SerializedName("reward_position") val rewardPosition: Int,
    @SerializedName("reward_type") val rewardType: String,
    @SerializedName("reward_value") val rewardValue: Double,
    @SerializedName("selected_at") val selectedAt: String,
    @SerializedName("contest_title") val contestTitle: String,
    @SerializedName("user_name") val userName: String
)

// 5. API Response Envelopes
data class ActiveContestsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("contests") val contests: List<Contest>
)

data class ContestDetailResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("contest") val contest: ContestDetail
)

data class EnterContestRequest(
    @SerializedName("source") val source: String = "AD"
)

data class BaseContestResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String
)

data class ContestWinnersResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("winners") val winners: List<ContestWinner>
)
```

---

## 📡 4. Retrofit API Service Interface

Create `com.thinkforgeapps.stuearnindia.data.api.ContestApiService.kt`:

```kotlin
package com.thinkforgeapps.stuearnindia.data.api

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

    @GET("api/contests/winners")
    suspend fun getContestWinners(): ContestWinnersResponse
}
```

---

## 🗃️ 5. Contests Repository Implementation

Create `com.thinkforgeapps.stuearnindia.data.repository.ContestRepository.kt`:

```kotlin
package com.thinkforgeapps.stuearnindia.data.repository

import com.thinkforgeapps.stuearnindia.data.api.ContestApiService
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
            emit(Resource.Error("Couldn't reach server. Check your internet connection."))
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

    suspend fun enterContest(jwtToken: String, id: String, source: String): Resource<String> {
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
            // Retrieve actual server response validation error message if present
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

Create `com.thinkforgeapps.stuearnindia.ui.screens.home.ContestViewModel.kt`:

```kotlin
package com.thinkforgeapps.stuearnindia.ui.screens.home

import android.content.Context
import android.widget.Toast
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

    fun loadWinnersFeed() {
        viewModelScope.launch {
            repository.getContestWinners().collect {
                _winnersState.value = it
            }
        }
    }

    fun earnRaffleTicket(context: Context, contestId: String) {
        viewModelScope.launch {
            _entryStatus.emit(Resource.Loading())
            
            // Hit API
            val result = repository.enterContest(jwtToken, contestId, "AD")
            _entryStatus.emit(result)
            
            if (result is Resource.Success) {
                // Refresh detail and lists
                loadContestDetail(contestId)
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

## 🎨 7. Premium Jetpack Compose UIs

Here are fully stylized modern Compose screens. Place them under `com.thinkforgeapps.stuearnindia.ui.screens.home/`:

### A. Active Contests List Screen (`ContestListScreen.kt`)
This list screen shows active promotional draws, global participation counters, current user ticket counts, and a beautifully formatted reward tier.

```kotlin
package com.thinkforgeapps.stuearnindia.ui.screens.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Groups
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.thinkforgeapps.stuearnindia.data.model.Contest
import com.thinkforgeapps.stuearnindia.ui.components.StuCoinIcon
import com.thinkforgeapps.stuearnindia.ui.navigation.Screen
import com.thinkforgeapps.stuearnindia.ui.theme.*
import com.thinkforgeapps.stuearnindia.util.Resource
import com.thinkforgeapps.stuearnindia.ui.components.shimmerEffect
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContestListScreen(
    navController: NavController,
    viewModel: ContestViewModel
) {
    val contestsState by viewModel.contestsState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadActiveContests()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Community Giveaways", fontWeight = FontWeight.Bold, color = TextPrimary) },
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
            when (contestsState) {
                is Resource.Loading -> {
                    LazyColumn(modifier = Modifier.padding(16.dp)) {
                        items(3) { ContestSkeletonItem() }
                    }
                }
                is Resource.Error -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("Unable to load contests", style = MaterialTheme.typography.titleMedium, color = TextSecondary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(contestsState.message ?: "Server error", color = Color.Gray, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { viewModel.loadActiveContests() },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal)
                        ) {
                            Text("Retry")
                        }
                    }
                }
                is Resource.Success -> {
                    val list = contestsState.data ?: emptyList()
                    if (list.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No active promotional giveaways right now.\nCheck back shortly!", color = TextSecondary, style = MaterialTheme.typography.bodyLarge)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Leaderboard Entry Card
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .shadow(4.dp, RoundedCornerShape(24.dp))
                                        .clickable { navController.navigate("contest_winners") },
                                    colors = CardDefaults.cardColors(containerColor = PastelMint),
                                    shape = RoundedCornerShape(24.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(20.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.EmojiEvents, contentDescription = "Winners", tint = PrimaryTeal, modifier = Modifier.size(36.dp))
                                        Spacer(modifier = Modifier.width(16.dp))
                                        Column {
                                            Text("View Past Winners 🏆", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                                            Text("See who won coins and gift vouchers recently", color = TextSecondary, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }

                            // Dynamic Feed List
                            items(list) { contest ->
                                ContestItem(contest = contest, onClick = {
                                    navController.navigate("contest_detail/${contest.id}")
                                })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ContestItem(contest: Contest, onClick: () -> Unit) {
    val topPrize = contest.rewards.firstOrNull()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(24.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        border = BorderStroke(1.dp, DividerColor)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Badge & Timer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(PastelMint)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = contest.type.replace("_", " "),
                        color = PrimaryTeal,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "Ends: " + formatIsoDate(contest.endTime),
                    color = ActionDeepOrange,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Title
            Text(
                text = contest.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Description
            Text(
                text = contest.description,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(16.dp))

            Divider(color = DividerColor)

            Spacer(modifier = Modifier.height(16.dp))

            // Stats footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Groups, contentDescription = "Participants", tint = TextSecondary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${contest.globalEntriesCount} tickets logged", fontSize = 12.sp, color = TextSecondary)
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ConfirmationNumber, contentDescription = "My Tickets", tint = PrimaryTeal, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("${contest.myTickets} Mine", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryTeal)
                }

                // Primary Prize Target
                if (topPrize != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(PastelMint)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        if (topPrize.type == "COINS") {
                            StuCoinIcon(size = 14.dp)
                        } else {
                            Text("₹", fontWeight = FontWeight.Bold, color = PrimaryTeal, fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = topPrize.value.toInt().toString() + " max",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = PrimaryTeal
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ContestSkeletonItem() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .height(180.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite)
    ) {
        Box(modifier = Modifier.fillMaxSize().shimmerEffect())
    }
}

fun formatIsoDate(isoString: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val date = parser.parse(isoString) ?: return ""
        val formatter = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault())
        formatter.format(date)
    } catch (e: Exception) {
        isoString.take(16)
    }
}
```

---

### B. Contest Detail & Entry Screen (`ContestDetailScreen.kt`)
This stateful details page is where the actual rewarded ad interactions take place. Users can tap the action CTA, trigger the AdMob loading wrapper, watch the video, and hit the backend endpoint to mint a ticket!

```kotlin
package com.thinkforgeapps.stuearnindia.ui.screens.home

import android.app.Activity
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.PlayArrow
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
import com.thinkforgeapps.stuearnindia.data.model.ContestDetail
import com.thinkforgeapps.stuearnindia.ui.components.StuCoinIcon
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
    val entryStatus by viewModel.entryStatus.collectAsState(initial = null)
    
    val context = LocalContext.current
    val activity = context as? Activity
    var isSubmitting by remember { mutableStateOf(false) }

    LaunchedEffect(contestId) {
        viewModel.loadContestDetail(contestId)
        // Pre-load the ad to keep user latency zero
        AdMobManager.loadStreakRewardedAd(context) 
    }

    // Capture Toast Feedback
    LaunchedEffect(entryStatus) {
        if (entryStatus != null) {
            when (entryStatus) {
                is Resource.Success -> {
                    isSubmitting = false
                    Toast.makeText(context, entryStatus!!.data ?: "Ticket Earned!", Toast.LENGTH_LONG).show()
                }
                is Resource.Error -> {
                    isSubmitting = false
                    Toast.makeText(context, entryStatus!!.message ?: "Failed to log entry", Toast.LENGTH_LONG).show()
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
                title = { Text("Giveaway Details", fontWeight = FontWeight.Bold, color = TextPrimary) },
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
                    ContestDetailContent(
                        detail = detail,
                        isSubmitting = isSubmitting,
                        onEarnClick = {
                            if (activity != null) {
                                // 1. Check if ad is ready
                                if (!AdMobManager.isStreakRewardedAdLoaded()) {
                                    Toast.makeText(context, "Ad buffer loading... Try in a second!", Toast.LENGTH_SHORT).show()
                                    AdMobManager.loadStreakRewardedAd(context)
                                    return@ContestDetailContent
                                }
                                
                                // 2. Launch Google Rewarded Ad
                                AdMobManager.showStreakRewardedAd(
                                    activity,
                                    onUserEarnedReward = {
                                        // 3. Register ad completion on database backend
                                        viewModel.earnRaffleTicket(context, detail.id)
                                    },
                                    onFailed = {
                                        Toast.makeText(context, "Failed to render video ad. Check internet connection.", Toast.LENGTH_SHORT).show()
                                    }
                                )
                            } else {
                                // Fallback
                                viewModel.earnRaffleTicket(context, detail.id)
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun ContestDetailContent(
    detail: ContestDetail,
    isSubmitting: Boolean,
    onEarnClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        // Visual Header Card
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
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(PastelMint, Color.White),
                            startY = 0f,
                            endY = 300f
                        )
                    )
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.ConfirmationNumber,
                    contentDescription = "Tickets",
                    tint = PrimaryTeal,
                    modifier = Modifier.size(64.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "My Raffle Tickets",
                    fontSize = 14.sp,
                    color = TextSecondary,
                    fontWeight = FontWeight.Medium
                )

                Text(
                    text = "${detail.myTickets} Tickets",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    color = PrimaryTeal
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Today's Limit Left: ${detail.entriesLeftToday} / ${detail.maxEntriesPerDay}",
                    color = if (detail.entriesLeftToday == 0) ActionDeepOrange else TextSecondary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Title and Description
        Text("Description", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
            border = BorderStroke(1.dp, DividerColor),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    detail.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    detail.description,
                    fontSize = 13.sp,
                    color = TextSecondary,
                    lineHeight = 18.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Reward Tier Section
        Text("Giveaway Prizes", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(12.dp))

        detail.rewards.forEach { reward ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                border = BorderStroke(1.dp, DividerColor)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(PastelMint),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "#${reward.position}",
                                color = PrimaryTeal,
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = when (reward.type) {
                                "COINS" -> "StuEarn Coins"
                                "CASH" -> "UPI Cash"
                                else -> "Amazon Gift Voucher"
                            },
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (reward.type == "COINS") {
                            StuCoinIcon(size = 18.dp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "${reward.value.toInt()}",
                                fontWeight = FontWeight.Black,
                                color = TextPrimary,
                                fontSize = 16.sp
                            )
                        } else {
                            Text(
                                "₹${reward.value.toInt()}",
                                fontWeight = FontWeight.Black,
                                color = PrimaryTeal,
                                fontSize = 16.sp
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(36.dp))

        // Earn CTA
        if (detail.status == "ACTIVE" && detail.entriesLeftToday > 0) {
            Button(
                onClick = onEarnClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .shadow(4.dp, RoundedCornerShape(28.dp)),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryTeal),
                shape = RoundedCornerShape(28.dp),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.PlayArrow, contentDescription = "Watch", tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Earn 1 Raffle Ticket (Watch Ad)", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                    }
                }
            }
        } else if (detail.status == "ACTIVE") {
            Button(
                onClick = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.LightGray),
                shape = RoundedCornerShape(28.dp),
                enabled = false
            ) {
                Text("Daily Limit Reached (Check back tomorrow!)", fontWeight = FontWeight.Bold, color = Color.DarkGray)
            }
        } else {
            Button(
                onClick = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.LightGray),
                shape = RoundedCornerShape(28.dp),
                enabled = false
            ) {
                Text("Draw Completed / Closed", fontWeight = FontWeight.Bold, color = Color.DarkGray)
            }
        }
    }
}
```

---

### C. Contest Winners Leaderboard (`ContestWinnersScreen.kt`)
This lists all historical completions, positions, reward values, and provides immediate visual proof to users that payouts are real.

```kotlin
package com.thinkforgeapps.stuearnindia.ui.screens.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.thinkforgeapps.stuearnindia.data.model.ContestWinner
import com.thinkforgeapps.stuearnindia.ui.components.StuCoinIcon
import com.thinkforgeapps.stuearnindia.ui.theme.*
import com.thinkforgeapps.stuearnindia.util.Resource

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContestWinnersScreen(
    navController: NavController,
    viewModel: ContestViewModel
) {
    val winnersState by viewModel.winnersState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadWinnersFeed()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Winners Scoreboard", fontWeight = FontWeight.Bold, color = TextPrimary) },
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
            when (winnersState) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = PrimaryTeal)
                    }
                }
                is Resource.Error -> {
                    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text(winnersState.message ?: "Server connection failed")
                    }
                }
                is Resource.Success -> {
                    val list = winnersState.data ?: emptyList()
                    if (list.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No winners drawn yet.", color = TextSecondary)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list) { winner ->
                                WinnerRowItem(winner = winner)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun WinnerRowItem(winner: ContestWinner) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(1.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        border = BorderStroke(1.dp, DividerColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                // Rank Avatar
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(
                            when (winner.rewardPosition) {
                                1 -> Color(0xFFFFD700) // Gold
                                2 -> Color(0xFFC0C0C0) // Silver
                                3 -> Color(0xFFCD7F32) // Bronze
                                else -> PastelMint
                            }
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (winner.rewardPosition <= 3) {
                        Icon(Icons.Default.EmojiEvents, contentDescription = "Trophy", tint = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            text = "${winner.rewardPosition}",
                            color = PrimaryTeal,
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column {
                    Text(
                        text = winner.userName,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        fontSize = 15.sp
                    )
                    Text(
                        text = winner.contestTitle,
                        fontSize = 12.sp,
                        color = TextSecondary,
                        maxLines = 1
                    )
                }
            }

            // Reward
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (winner.rewardType == "COINS") {
                    StuCoinIcon(size = 16.dp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "${winner.rewardValue.toInt()}",
                        fontWeight = FontWeight.Black,
                        color = TextPrimary,
                        fontSize = 15.sp
                    )
                } else {
                    Text(
                        "₹${winner.rewardValue.toInt()}",
                        fontWeight = FontWeight.Black,
                        color = PrimaryTeal,
                        fontSize = 15.sp
                    )
                }
            }
        }
    }
}
```

---

## 🚀 8. Assembly & Integration Checklist

1. **Retrofit Config**:
   Register `ContestApiService` inside your main injection module or Retrofit client initializer, e.g. `retrofit.create(ContestApiService::class.java)`.
2. **ViewModel Creation**:
   Initialize your `ContestViewModel` inside `HomeScreen.kt` or when navigating to the contests stack. Pass in the logged-in user's JWT token fetched during authentication.
3. **Ad Setup Compliance**:
   Ensure `AdMobManager.loadStreakRewardedAd(context)` is called during loading screen triggers so that by the time the user clicks to earn a raffle ticket, the interstitial rewarded ad is cached in memory.
4. **Deep Linking**:
   Register `stuearn://contests` and `stuearn://contests/:id` in your navigation controller or AndroidManifest scheme lists to enable push/in-app navigation support!
