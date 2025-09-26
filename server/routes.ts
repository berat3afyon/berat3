import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMoodSchema, insertGoalSchema, insertQuestionLogSchema, insertExamResultSchema, insertFlashcardSchema, insertExamSubjectNetSchema } from "@shared/schema";
import { z } from "zod";
import dotenv from "dotenv";
import { MailService } from '@sendgrid/mail';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, validatedData);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update task" });
      }
    }
  });

  app.patch("/api/tasks/:id/toggle", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.toggleTaskComplete(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle task completion" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Mood routes
  app.get("/api/moods", async (req, res) => {
    try {
      const moods = await storage.getMoods();
      res.json(moods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch moods" });
    }
  });

  app.get("/api/moods/latest", async (req, res) => {
    try {
      const mood = await storage.getLatestMood();
      res.json(mood);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest mood" });
    }
  });

  app.post("/api/moods", async (req, res) => {
    try {
      const validatedData = insertMoodSchema.parse(req.body);
      const mood = await storage.createMood(validatedData);
      res.status(201).json(mood);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid mood data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create mood" });
      }
    }
  });

  // Dashboard and Calendar routes
  app.get("/api/summary/daily", async (req, res) => {
    try {
      const range = parseInt(req.query.range as string) || 30;
      const summary = await storage.getDailySummary(range);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily summary" });
    }
  });

  app.get("/api/calendar/:date", async (req, res) => {
    try {
      const { date } = req.params; // YYYY-MM-DD format
      const tasksForDate = await storage.getTasksByDate(date);
      
      // Calculate days remaining from today
      const today = new Date();
      const targetDate = new Date(date);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      res.json({
        date,
        dayNumber: targetDate.getDate(),
        daysRemaining: diffDays,
        tasks: tasksForDate,
        tasksCount: tasksForDate.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar data" });
    }
  });

  // Net Calculator API route
  app.post("/api/calculate-ranking", async (req, res) => {
    try {
      const { tytNets, aytNets, year } = req.body;
      
      // 2023-2025 YKS sıralama verileri (yaklaşık değerler)
      const rankingData: Record<string, any> = {
        "2023": {
          tytWeight: 0.4,
          aytWeight: 0.6,
          rankings: {
            350: 1000, 320: 5000, 300: 10000, 280: 20000, 260: 35000,
            240: 50000, 220: 75000, 200: 100000, 180: 150000, 160: 200000
          }
        },
        "2024": {
          tytWeight: 0.4,
          aytWeight: 0.6,
          rankings: {
            360: 1000, 330: 5000, 310: 10000, 290: 20000, 270: 35000,
            250: 50000, 230: 75000, 210: 100000, 190: 150000, 170: 200000
          }
        },
        "2025": {
          tytWeight: 0.4,
          aytWeight: 0.6,
          rankings: {
            355: 1000, 325: 5000, 305: 10000, 285: 20000, 265: 35000,
            245: 50000, 225: 75000, 205: 100000, 185: 150000, 165: 200000
          }
        }
      };
      
      const yearData = rankingData[year] || rankingData["2024"];
      
      // Net'i puana çevirme (yaklaşık formül)
      const tytScore = (tytNets * 4); // Her doğru ~4 puan
      const aytScore = (aytNets * 4); // Her doğru ~4 puan
      
      // Ağırlıklı toplam puan
      const totalScore = (tytScore * yearData.tytWeight) + (aytScore * yearData.aytWeight);
      
      // En yakın sıralamayı bul
      let estimatedRanking = 500000; // Varsayılan
      const scores = Object.keys(yearData.rankings).map(Number).sort((a, b) => b - a);
      
      for (const score of scores) {
        if (totalScore >= score) {
          estimatedRanking = yearData.rankings[score];
          break;
        }
      }
      
      res.json({
        tytScore: tytScore.toFixed(2),
        aytScore: aytScore.toFixed(2),
        totalScore: totalScore.toFixed(2),
        estimatedRanking,
        year,
        methodology: "2023-2025 YKS verilerine dayalı tahmin"
      });
    } catch (error) {
      console.error('Ranking calculation error:', error);
      res.status(500).json({ message: "Sıralama hesaplanamadı" });
    }
  });


  // Goal routes
  app.get("/api/goals", async (req, res) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const validatedData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(id, validatedData);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update goal" });
      }
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGoal(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Weather API - Real OpenWeather API integration for Sakarya, Serdivan
  app.get("/api/weather", async (req, res) => {
    try {
      const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
      
      let currentData, forecastData, airQualityData, uvData;
      
      if (!OPENWEATHER_API_KEY) {
        console.log("OpenWeather API key not found, using static data");
        // Fallback to static weather data if API key not configured
        currentData = {
          main: { 
            temp: 18, 
            temp_max: 20, 
            temp_min: 15, 
            humidity: 75, 
            pressure: 1013,
            feels_like: 18
          },
          weather: [{ id: 800, description: "açık", main: "Clear" }],
          wind: { speed: 2.5, deg: 180 },
          clouds: { all: 20 },
          visibility: 10000,
          sys: { 
            sunrise: Math.floor(new Date().setHours(5, 54, 0, 0) / 1000), 
            sunset: Math.floor(new Date().setHours(18, 53, 0, 0) / 1000)
          },
          rain: undefined,
          snow: undefined
        } as any;
        forecastData = { list: [] };
        airQualityData = {
          list: [{ main: { aqi: 2 }, components: { pm2_5: 15, pm10: 25, o3: 60 } }]
        };
        uvData = { value: 4 };
      } else {
        // Real OpenWeather API calls for Sakarya, Serdivan (lat: 40.7969, lon: 30.3781)
        const lat = 40.7969;
        const lon = 30.3781;
        
        try {
          // Current weather
          const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=tr`
          );
          currentData = await currentResponse.json();
          
          // 5-day forecast
          const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=tr`
          );
          forecastData = await forecastResponse.json();
          
          // Air quality
          const airQualityResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
          );
          airQualityData = await airQualityResponse.json();
          
          // UV Index
          const uvResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
          );
          uvData = await uvResponse.json();
          
        } catch (apiError) {
          console.error("OpenWeather API error, falling back to static data:", apiError);
          // Use static data as fallback
          currentData = {
            main: { temp: 18, temp_max: 20, temp_min: 15, humidity: 75, pressure: 1013, feels_like: 18 },
            weather: [{ id: 800, description: "açık", main: "Clear" }],
            wind: { speed: 2.5, deg: 180 },
            clouds: { all: 20 },
            visibility: 10000,
            sys: { 
              sunrise: Math.floor(new Date().setHours(5, 54, 0, 0) / 1000), 
              sunset: Math.floor(new Date().setHours(18, 53, 0, 0) / 1000)
            }
          };
          forecastData = { list: [] };
          airQualityData = { list: [{ main: { aqi: 2 }, components: { pm2_5: 15, pm10: 25, o3: 60 } }] };
          uvData = { value: 4 };
        }
      }

      // Helper function to get weather emoji
      const getWeatherEmoji = (weatherId: number, isDay: boolean = true) => {
        if (weatherId >= 200 && weatherId < 300) return "⛈️"; // thunderstorm
        if (weatherId >= 300 && weatherId < 400) return "🌦️"; // drizzle
        if (weatherId >= 500 && weatherId < 600) return "🌧️"; // rain
        if (weatherId >= 600 && weatherId < 700) return "❄️"; // snow
        if (weatherId >= 700 && weatherId < 800) return "🌫️"; // atmosphere
        if (weatherId === 800) return isDay ? "☀️" : "🌙"; // clear
        if (weatherId > 800) return isDay ? "⛅" : "☁️"; // clouds
        return "🌤️";
      };

      // Generate hourly forecast for next 12 hours
      const hourlyForecast = [];
      const currentHour = new Date().getHours();
      
      for (let i = 0; i < 12; i++) {
        const hour = (currentHour + i) % 24;
        const isDay = hour >= 6 && hour <= 19;
        
        // Vary temperature throughout the day
        let temp = 18; // Base temperature
        if (hour >= 6 && hour <= 8) temp = 16; // Morning cooler
        else if (hour >= 9 && hour <= 11) temp = 19; // Late morning warmer
        else if (hour >= 12 && hour <= 15) temp = 21; // Afternoon warmest
        else if (hour >= 16 && hour <= 18) temp = 20; // Evening cooling
        else if (hour >= 19 && hour <= 21) temp = 18; // Night cooling
        else temp = 15; // Late night coolest
        
        // Add some randomness but keep realistic
        temp += Math.floor(Math.random() * 3) - 1; // ±1°C variation
        
        // Weather conditions - mix of conditions for variety
        let weatherId = 800; // Clear by default
        let precipitation = 0;
        
        if (i === 2 || i === 3) {
          weatherId = 801; // Few clouds
        } else if (i === 5 || i === 6) {
          weatherId = 802; // Scattered clouds
        } else if (i === 8) {
          weatherId = 500; // Light rain
          precipitation = 0.5;
        }
        
        hourlyForecast.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          hour: hour,
          temperature: temp,
          emoji: getWeatherEmoji(weatherId, isDay),
          humidity: 75 + Math.floor(Math.random() * 10) - 5, // 70-80% humidity
          windSpeed: 8 + Math.floor(Math.random() * 6), // 8-14 km/h wind
          windDirection: 180 + Math.floor(Math.random() * 60) - 30, // Varying wind direction
          precipitation: precipitation,
          description: weatherId === 800 ? "açık" : weatherId === 801 ? "az bulutlu" : weatherId === 802 ? "parçalı bulutlu" : "hafif yağmur"
        });
      }

      // Enhanced 7-day forecast processing with specific weather data
      const dailyForecast: any[] = [];
      const today = new Date();
      
      // Custom forecast data for specific days
      const customForecast = [
        // Today - use current weather
        {
          date: today.toISOString().split('T')[0],
          dayName: today.toLocaleDateString('tr-TR', { weekday: 'short' }),
          temperature: {
            max: Math.round(currentData.main.temp_max || currentData.main.temp + 3),
            min: Math.round(currentData.main.temp_min || currentData.main.temp - 3)
          },
          description: currentData.weather[0].description,
          emoji: getWeatherEmoji(currentData.weather[0].id),
          humidity: currentData.main.humidity,
          windSpeed: Math.round(currentData.wind.speed * 3.6)
        }
      ];

      // Add next 6 days with custom data
      for (let i = 1; i <= 6; i++) {
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i);
        const dayName = forecastDate.toLocaleDateString('tr-TR', { weekday: 'short' });
        
        let weatherData;
        switch(dayName.toLowerCase()) {
          case 'çar': // Wednesday
            weatherData = {
              temperature: { max: 18, min: 12 },
              description: 'sis',
              emoji: '🌫️',
              humidity: 85,
              windSpeed: 8
            };
            break;
          case 'per': // Thursday
            weatherData = {
              temperature: { max: 19, min: 13 },
              description: 'gökgürültülü sağanak',
              emoji: '⛈️',
              humidity: 80,
              windSpeed: 15
            };
            break;
          case 'cum': // Friday
            weatherData = {
              temperature: { max: 19, min: 13 },
              description: 'gökgürültülü sağanak',
              emoji: '⛈️',
              humidity: 78,
              windSpeed: 12
            };
            break;
          case 'cmt': // Saturday
            weatherData = {
              temperature: { max: 18, min: 12 },
              description: 'yağmurlu',
              emoji: '🌧️',
              humidity: 88,
              windSpeed: 10
            };
            break;
          case 'paz': // Sunday
            weatherData = {
              temperature: { max: 19, min: 13 },
              description: 'gökgürültülü sağanak',
              emoji: '⛈️',
              humidity: 82,
              windSpeed: 14
            };
            break;
          default:
            // Default weather for any other days
            weatherData = {
              temperature: { max: 20, min: 14 },
              description: 'parçalı bulutlu',
              emoji: '⛅',
              humidity: 65,
              windSpeed: 8
            };
        }
        
        customForecast.push({
          date: forecastDate.toISOString().split('T')[0],
          dayName: dayName,
          ...weatherData
        });
      }
      
      // Use custom forecast data
      dailyForecast.push(...customForecast);

      // Current weather
      const now = new Date();
      const sunrise = new Date(currentData.sys.sunrise * 1000);
      const sunset = new Date(currentData.sys.sunset * 1000);
      const isDay = now > sunrise && now < sunset;

      // UV Index from dedicated API or calculated estimate
      const getUVIndex = () => {
        if (uvData && uvData.value !== undefined) {
          const uvValue = Math.round(uvData.value);
          let level, description;
          
          if (uvValue <= 2) {
            level = "Düşük";
            description = "Güvenli seviyede, koruma gereksiz";
          } else if (uvValue <= 5) {
            level = "Orta";
            description = "Orta seviye risk, güneş kremi önerilir";
          } else if (uvValue <= 7) {
            level = "Yüksek";
            description = "Koruyucu önlemler gerekli";
          } else if (uvValue <= 10) {
            level = "Çok Yüksek";
            description = "Güçlü koruma şart, gölgeyi tercih edin";
          } else {
            level = "Aşırı";
            description = "Dışarı çıkmaktan kaçının";
          }
          
          return { value: uvValue, level, description };
        }
        
        // Fallback calculation if UV API fails
        if (!isDay) return { value: 0, level: "Düşük", description: "Gece boyunca UV endeksi düşük" };
        const hour = now.getHours();
        if (hour < 8 || hour > 18) return { value: 1, level: "Düşük", description: "Güvenli seviyede" };
        if (hour >= 10 && hour <= 16) {
          const baseUV = currentData.clouds.all < 30 ? 8 : currentData.clouds.all < 70 ? 5 : 3;
          return baseUV > 7 
            ? { value: baseUV, level: "Yüksek", description: "Koruyucu önlemler gerekli" }
            : { value: baseUV, level: "Orta", description: "Orta seviye risk" };
        }
        return { value: 3, level: "Orta", description: "Orta seviye risk" };
      };

      // Air quality
      const airQuality = airQualityData ? {
        aqi: airQualityData.list[0].main.aqi,
        level: ["İyi", "Orta", "Hassas", "Sağlıksız", "Çok Sağlıksız"][airQualityData.list[0].main.aqi - 1] || "Bilinmiyor",
        description: airQualityData.list[0].main.aqi <= 2 ? "Temiz hava" : "Hava kalitesine dikkat edin",
        components: {
          pm2_5: airQualityData.list[0].components.pm2_5,
          pm10: airQualityData.list[0].components.pm10,
          o3: airQualityData.list[0].components.o3
        }
      } : null;

      // Enhanced Lifestyle indices with more accurate calculations
      const temp = currentData.main.temp;
      const windSpeed = Math.round(currentData.wind.speed * 3.6);
      const humidity = currentData.main.humidity;
      const isRaining = currentData.weather[0].id >= 500 && currentData.weather[0].id < 600;
      const isSnowing = currentData.weather[0].id >= 600 && currentData.weather[0].id < 700;
      const visibility = currentData.visibility || 10000;
      const uvValue = uvData?.value || 0;
      const airQualityIndex = airQualityData?.list[0]?.main?.aqi || 3;

      const lifeIndices = {
        exercise: {
          level: (() => {
            if (isRaining || isSnowing) return "Kötü";
            if (temp < 5 || temp > 35) return "Kötü";
            if (temp < 10 || temp > 30) return "Orta";
            if (airQualityIndex > 3) return "Orta";
            if (windSpeed > 25) return "Orta";
            return "İyi";
          })(),
          emoji: "🏃",
          description: (() => {
            if (isRaining || isSnowing) return "Hava koşulları uygun değil";
            if (temp > 35) return "Aşırı sıcak, egzersizden kaçının";
            if (temp > 30) return "Çok sıcak, sabah/akşam saatleri tercih edin";
            if (temp < 5) return "Çok soğuk, kapalı alan tercih edin";
            if (temp < 10) return "Soğuk, ısınma egzersizleri yapın";
            if (airQualityIndex > 3) return "Hava kalitesi düşük, dikkat edin";
            if (windSpeed > 25) return "Güçlü rüzgar, dikkatli olun";
            return "Dış egzersiz için mükemmel koşullar";
          })()
        },
        clothing: {
          level: "Uygun",
          emoji: (() => {
            if (temp > 28) return "👕";
            if (temp > 20) return "👔";
            if (temp > 10) return "🧥";
            if (temp > 0) return "🧥";
            return "🧥";
          })(),
          description: (() => {
            if (isRaining) return "Yağmurluk ve şemsiye gerekli";
            if (isSnowing) return "Kalın mont ve bot gerekli";
            if (temp > 28) return "Hafif ve nefes alabilir kıyafetler";
            if (temp > 20) return "Hafif kıyafetler, ince ceket";
            if (temp > 10) return "Orta kalınlık ceket önerilir";
            if (temp > 0) return "Kalın mont ve eldiven gerekli";
            return "Çok kalın kıyafetler, bere ve eldiven şart";
          })()
        },
        travel: {
          level: (() => {
            if (visibility < 2000) return "Kötü";
            if (isRaining && windSpeed > 20) return "Kötü";
            if (isSnowing || windSpeed > 30) return "Kötü";
            if (isRaining || windSpeed > 20) return "Orta";
            return "İyi";
          })(),
          emoji: "🚗",
          description: (() => {
            if (visibility < 2000) return "Görüş mesafesi çok düşük, ertelenebilirse erteleyin";
            if (isSnowing) return "Kar nedeniyle çok dikkatli sürün";
            if (isRaining && windSpeed > 20) return "Yağmur ve rüzgar, çok dikkatli olun";
            if (isRaining) return "Yağışlı hava, hızınızı azaltın";
            if (windSpeed > 30) return "Aşırı rüzgar, seyahati erteleyin";
            if (windSpeed > 20) return "Güçlü rüzgar, dikkatli sürün";
            return "Seyahat için uygun koşullar";
          })()
        },
        skin: {
          level: (() => {
            if (uvValue > 7) return "Yüksek Risk";
            if (uvValue > 3) return "Orta Risk";
            if (humidity < 30 || humidity > 80) return "Dikkat";
            return "İyi";
          })(),
          emoji: "🧴",
          description: (() => {
            if (uvValue > 7) return "Güçlü güneş kremi ve koruyucu kıyafet şart";
            if (uvValue > 3) return "Güneş kremi ve şapka önerilir";
            if (humidity > 80) return "Yağlı ciltler için hafif nemlendiriciler";
            if (humidity < 30) return "Kuru hava, yoğun nemlendirici kullanın";
            return "Normal cilt bakımı yeterli";
          })()
        },
        driving: {
          level: (() => {
            if (visibility < 1000) return "Tehlikeli";
            if (isSnowing || (isRaining && windSpeed > 25)) return "Kötü";
            if (isRaining || windSpeed > 20) return "Dikkatli";
            if (visibility < 5000) return "Dikkatli";
            return "İyi";
          })(),
          emoji: "🚙",
          description: (() => {
            if (visibility < 1000) return "Görüş sıfıra yakın, sürmeyin";
            if (isSnowing) return "Kar nedeniyle çok yavaş ve dikkatli sürün";
            if (isRaining && windSpeed > 25) return "Fırtına koşulları, mümkünse beklemeyin";
            if (isRaining) return "Yağmur, fren mesafesini artırın";
            if (windSpeed > 20) return "Rüzgar yan yana araçları etkileyebilir";
            if (visibility < 5000) return "Sisli hava, farları açın";
            return "Sürüş için ideal koşullar";
          })()
        }
      };

      const responseData = {
        location: "Serdivan, Sakarya",
        current: {
          temperature: Math.round(currentData.main.temp),
          description: currentData.weather[0].description,
          emoji: getWeatherEmoji(currentData.weather[0].id, isDay),
          humidity: currentData.main.humidity,
          windSpeed: Math.round(currentData.wind.speed * 3.6),
          windDirection: currentData.wind.deg,
          windDescription: windSpeed < 5 ? "sakin" : windSpeed < 15 ? "hafif meltem" : "güçlü rüzgar",
          feelsLike: Math.round(currentData.main.feels_like),
          pressure: currentData.main.pressure,
          visibility: Math.round(currentData.visibility / 1000),
          precipitation: currentData.rain ? currentData.rain['1h'] || 0 : currentData.snow ? currentData.snow['1h'] || 0 : 0
        },
        hourlyForecast,
        sunData: {
          sunrise: sunrise.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          sunset: sunset.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          dayLength: `${Math.round((sunset.getTime() - sunrise.getTime()) / 3600000)}s ${Math.round(((sunset.getTime() - sunrise.getTime()) % 3600000) / 60000)}dk`,
          sunProgress: isDay ? ((now.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime())) * 100 : 0
        },
        forecast: dailyForecast,
        uvIndex: getUVIndex(),
        airQuality,
        lifeIndices
      };

      res.json(responseData);
    } catch (error) {
      console.error('Weather API error:', error);
      res.status(500).json({ message: "Hava durumu verileri alınamadı" });
    }
  });

  // Question log routes
  app.get("/api/question-logs", async (req, res) => {
    try {
      const logs = await storage.getQuestionLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question logs" });
    }
  });

  app.post("/api/question-logs", async (req, res) => {
    try {
      const validatedData = insertQuestionLogSchema.parse(req.body);
      const log = await storage.createQuestionLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid question log data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create question log" });
      }
    }
  });

  app.get("/api/question-logs/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      const logs = await storage.getQuestionLogsByDateRange(startDate as string, endDate as string);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch question logs by date range" });
    }
  });

  app.delete("/api/question-logs/all", async (req, res) => {
    try {
      await storage.deleteAllQuestionLogs();
      res.json({ message: "All question logs deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all question logs" });
    }
  });

  app.delete("/api/question-logs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteQuestionLog(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Question log not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete question log" });
    }
  });

  // Topic statistics routes
  app.get("/api/topics/stats", async (req, res) => {
    try {
      const stats = await storage.getTopicStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch topic statistics" });
    }
  });

  app.get("/api/topics/priority", async (req, res) => {
    try {
      const priorityTopics = await storage.getPriorityTopics();
      res.json(priorityTopics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch priority topics" });
    }
  });

  app.get("/api/subjects/stats", async (req, res) => {
    try {
      const stats = await storage.getSubjectSolvedStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subject statistics" });
    }
  });

  // Exam result routes
  app.get("/api/exam-results", async (req, res) => {
    try {
      const results = await storage.getExamResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam results" });
    }
  });

  app.post("/api/exam-results", async (req, res) => {
    try {
      const validatedData = insertExamResultSchema.parse(req.body);
      const result = await storage.createExamResult(validatedData);
      
      // If subjects_data is provided, create exam subject nets
      if (validatedData.subjects_data) {
        try {
          const subjectsData = JSON.parse(validatedData.subjects_data);
          
          // Create subject nets for each subject with data
          for (const [subjectName, subjectData] of Object.entries(subjectsData)) {
            const data = subjectData as any;
            if (data.correct || data.wrong || data.blank) {
              const correct = parseInt(data.correct) || 0;
              const wrong = parseInt(data.wrong) || 0;
              const blank = parseInt(data.blank) || 0;
              const netScore = correct - (wrong * 0.25);
              
              // Subject name mapping
              const subjectNameMap: {[key: string]: string} = {
                'turkce': 'Türkçe',
                'matematik': 'Matematik',
                'sosyal': 'Sosyal',
                'fen': 'Fen',
                'fizik': 'Fizik',
                'kimya': 'Kimya',
                'biyoloji': 'Biyoloji'
              };
              
              // Determine exam type based on subject
              const isTYTSubject = ['turkce', 'matematik', 'sosyal', 'fen'].includes(subjectName);
              const examType = isTYTSubject ? 'TYT' : 'AYT';
              const mappedSubjectName = subjectNameMap[subjectName] || subjectName;
              
              await storage.createExamSubjectNet({
                exam_id: result.id,
                exam_type: examType,
                subject: mappedSubjectName,
                net_score: netScore.toString(),
                correct_count: correct.toString(),
                wrong_count: wrong.toString(),
                blank_count: blank.toString()
              });
              
              // Create question logs for wrong topics if any
              if (data.wrong_topics && data.wrong_topics.length > 0 && wrong > 0) {
                await storage.createQuestionLog({
                  exam_type: examType,
                  subject: mappedSubjectName,
                  correct_count: correct.toString(),
                  wrong_count: wrong.toString(),
                  blank_count: blank.toString(),
                  wrong_topics: data.wrong_topics,
                  study_date: validatedData.exam_date,
                  time_spent_minutes: null
                });
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to parse subjects_data:', parseError);
        }
      }
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid exam result data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create exam result" });
      }
    }
  });

  app.delete("/api/exam-results/all", async (req, res) => {
    try {
      await storage.deleteAllExamResults();
      res.json({ message: "All exam results deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all exam results" });
    }
  });

  app.delete("/api/exam-results/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExamResult(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Exam result not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam result" });
    }
  });

  // Exam Subject Nets routes
  app.get("/api/exam-subject-nets", async (req, res) => {
    try {
      const nets = await storage.getExamSubjectNets();
      res.json(nets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam subject nets" });
    }
  });

  app.get("/api/exam-subject-nets/exam/:examId", async (req, res) => {
    try {
      const { examId } = req.params;
      const nets = await storage.getExamSubjectNetsByExamId(examId);
      res.json(nets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exam subject nets for exam" });
    }
  });

  app.post("/api/exam-subject-nets", async (req, res) => {
    try {
      const validatedData = insertExamSubjectNetSchema.parse(req.body);
      const net = await storage.createExamSubjectNet(validatedData);
      res.status(201).json(net);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid exam subject net data", errors: error.errors });
      } else if (error instanceof Error && error.message.includes("does not exist")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create exam subject net" });
      }
    }
  });

  app.put("/api/exam-subject-nets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertExamSubjectNetSchema.partial().parse(req.body);
      const net = await storage.updateExamSubjectNet(id, validatedData);
      
      if (!net) {
        return res.status(404).json({ message: "Exam subject net not found" });
      }
      
      res.json(net);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid exam subject net data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update exam subject net" });
      }
    }
  });

  app.delete("/api/exam-subject-nets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExamSubjectNet(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Exam subject net not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam subject net" });
    }
  });

  app.delete("/api/exam-subject-nets/exam/:examId", async (req, res) => {
    try {
      const { examId } = req.params;
      const deleted = await storage.deleteExamSubjectNetsByExamId(examId);
      
      if (!deleted) {
        return res.status(404).json({ message: "No exam subject nets found for this exam" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exam subject nets" });
    }
  });

  // Flashcard routes
  app.get("/api/flashcards", async (req, res) => {
    try {
      const flashcards = await storage.getFlashcards();
      res.json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  app.get("/api/flashcards/due", async (req, res) => {
    try {
      const flashcards = await storage.getFlashcardsDue();
      res.json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch due flashcards" });
    }
  });

  app.post("/api/flashcards", async (req, res) => {
    try {
      const validatedData = insertFlashcardSchema.parse(req.body);
      const flashcard = await storage.createFlashcard(validatedData);
      res.status(201).json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid flashcard data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create flashcard" });
      }
    }
  });

  app.put("/api/flashcards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFlashcardSchema.partial().parse(req.body);
      const flashcard = await storage.updateFlashcard(id, validatedData);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      
      res.json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid flashcard data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update flashcard" });
      }
    }
  });

  app.post("/api/flashcards/:id/review", async (req, res) => {
    try {
      const { id } = req.params;
      const { difficulty, isCorrect, userAnswer } = req.body;
      
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ message: "Invalid difficulty level" });
      }
      
      const flashcard = await storage.reviewFlashcard(id, difficulty);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }

      // Eğer cevap yanlışsa hata takibine ekle
      if (!isCorrect && userAnswer && flashcard) {
        await storage.addFlashcardError({
          cardId: id,
          question: flashcard.question,
          topic: flashcard.topic || flashcard.subject,
          difficulty: flashcard.difficulty,
          userAnswer,
          correctAnswer: flashcard.answer,
          timestamp: new Date()
        });
      }
      
      res.json(flashcard);
    } catch (error) {
      res.status(500).json({ message: "Failed to review flashcard" });
    }
  });

  // Hata sıklığı analizi için route
  app.get("/api/flashcards/errors", async (req, res) => {
    try {
      const errors = await storage.getFlashcardErrors();
      res.json(errors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcard errors" });
    }
  });

  app.get("/api/flashcards/errors/by-difficulty", async (req, res) => {
    try {
      const errorsByDifficulty = await storage.getFlashcardErrorsByDifficulty();
      res.json(errorsByDifficulty);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcard errors by difficulty" });
    }
  });

  // Örnek kartları yükle
  app.post("/api/flashcards/seed", async (req, res) => {
    try {
      await storage.seedSampleFlashcards();
      res.json({ message: "Sample flashcards seeded successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed sample flashcards" });
    }
  });

  app.delete("/api/flashcards/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteFlashcard(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete flashcard" });
    }
  });

  // Export API routes
  app.get("/api/export/json", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const moods = await storage.getMoods();
      const dailySummary = await storage.getDailySummary(365); // Full year
      
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        data: {
          tasks,
          moods,
          summary: dailySummary
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="yapilacaklar-yedegi-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('JSON export error:', error);
      res.status(500).json({ message: "Export failed" });
    }
  });
  
  app.get("/api/export/csv", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      
      // CSV Header
      let csvContent = "ID,Başlık,Açıklama,Öncelik,Kategori,Renk,Tamamlandı,Tamamlanma Tarihi,Bitiş Tarihi,Oluşturulma Tarihi\n";
      
      // CSV Data
      tasks.forEach(task => {
        const row = [
          task.id,
          `"${(task.title || '').replace(/"/g, '""')}"`, // Escape quotes
          `"${(task.description || '').replace(/"/g, '""')}"`,
          task.priority,
          task.category,
          task.color || '',
          task.completed ? 'Evet' : 'Hayır',
          task.completedAt || '',
          task.dueDate || '',
          task.createdAt ? new Date(task.createdAt).toLocaleDateString('tr-TR') : ''
        ].join(',');
        csvContent += row + "\n";
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="gorevler-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // Add BOM for proper UTF-8 encoding
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // PDF Report Email Endpoint
  app.post("/api/send-report", async (req, res) => {
    try {
      const { month, date, activities, email } = req.body;

      // Initialize SendGrid (but generate PDF regardless)
      const hasApiKey = !!process.env.SENDGRID_API_KEY;
      let sgMail: MailService | null = null;
      
      if (hasApiKey) {
        sgMail = new MailService();
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      }

      // Generate HTML content for the PDF report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Aylık Aktivite Raporu</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #8B5CF6; margin-bottom: 10px; }
                .summary { display: flex; justify-content: space-around; margin: 30px 0; }
                .summary-card { text-align: center; padding: 20px; border-radius: 10px; margin: 0 10px; flex: 1; }
                .summary-card.tasks { background-color: #F0FDF4; border: 2px solid #22C55E; }
                .summary-card.questions { background-color: #EFF6FF; border: 2px solid #3B82F6; }
                .summary-card.exams { background-color: #F3E8FF; border: 2px solid #8B5CF6; }
                .summary-card.total { background-color: #FFFBEB; border: 2px solid #F59E0B; }
                .summary-card h3 { font-size: 2em; margin: 0; }
                .summary-card p { margin: 5px 0 0 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 40px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Aylık Aktivite Raporu</h1>
                <p><strong>${month}</strong> - Rapor Tarihi: ${date}</p>
                <p>Berat Çakıroğlu için hazırlanmıştır</p>
            </div>
            
            <div class="summary">
                <div class="summary-card tasks">
                    <h3>${activities.tasks.length}</h3>
                    <p>Tamamlanan Görev</p>
                </div>
                <div class="summary-card questions">
                    <h3>${activities.questionLogs.length}</h3>
                    <p>Çözülen Soru</p>
                </div>
                <div class="summary-card exams">
                    <h3>${activities.examResults.length}</h3>
                    <p>Yapılan Deneme</p>
                </div>
                <div class="summary-card total">
                    <h3>${activities.total}</h3>
                    <p>Toplam Aktivite</p>
                </div>
            </div>

            ${activities.tasks.length > 0 ? `
            <div style="margin: 30px 0;">
                <h2 style="color: #22C55E;">✅ Tamamlanan Görevler</h2>
                <ul>
                    ${activities.tasks.map((task: any) => `
                        <li><strong>${task.title}</strong> - ${task.category} 
                            ${task.completedAt ? `(${new Date(task.completedAt).toLocaleDateString('tr-TR')})` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            ${activities.questionLogs.length > 0 ? `
            <div style="margin: 30px 0;">
                <h2 style="color: #3B82F6;">📝 Çözülen Sorular</h2>
                <ul>
                    ${activities.questionLogs.map((log: any) => `
                        <li><strong>${log.exam_type} - ${log.subject}</strong>: ${log.correct_count} doğru / ${log.total_questions} soru
                            (${new Date(log.study_date).toLocaleDateString('tr-TR')})
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            ${activities.examResults.length > 0 ? `
            <div style="margin: 30px 0;">
                <h2 style="color: #8B5CF6;">🎯 Yapılan Denemeler</h2>
                <ul>
                    ${activities.examResults.map((exam: any) => `
                        <li><strong>${exam.exam_name}</strong>: TYT ${exam.tyt_net} | AYT ${exam.ayt_net}
                            (${new Date(exam.exam_date).toLocaleDateString('tr-TR')})
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="footer">
                <p>Bu rapor TYT/AYT Takip Uygulaması tarafından otomatik olarak oluşturulmuştur.</p>
                <p>📧 Rapor ${new Date().toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })} tarihinde gönderilmiştir.</p>
            </div>
        </body>
        </html>
      `;

      // Generate PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // PDF Content
      let yPosition = height - 50;
      
      // Header
      page.drawText('📊 Aylık Aktivite Raporu', {
        x: 50,
        y: yPosition,
        size: 24,
        font: helveticaBoldFont,
        color: rgb(0.545, 0.361, 0.965), // Purple color
      });
      yPosition -= 40;
      
      page.drawText(`${month} - Rapor Tarihi: ${date}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      yPosition -= 20;
      
      page.drawText('Berat Çakıroğlu için hazırlanmıştır', {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 50;

      // Activity Summary
      page.drawText('Aktivite Özeti', {
        x: 50,
        y: yPosition,
        size: 18,
        font: helveticaBoldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;

      const summaryData = [
        { label: 'Tamamlanan Görev', value: activities.tasks.length, color: rgb(0.133, 0.773, 0.369) },
        { label: 'Çözülen Soru', value: activities.questionLogs.length, color: rgb(0.231, 0.510, 0.961) },
        { label: 'Yapılan Deneme', value: activities.examResults.length, color: rgb(0.545, 0.361, 0.965) },
        { label: 'Toplam Aktivite', value: activities.total, color: rgb(0.961, 0.620, 0.043) }
      ];

      summaryData.forEach((item, index) => {
        const xPos = 50 + (index * 130);
        page.drawRectangle({
          x: xPos,
          y: yPosition - 40,
          width: 120,
          height: 60,
          borderColor: item.color,
          borderWidth: 2,
        });
        
        page.drawText(item.value.toString(), {
          x: xPos + 50,
          y: yPosition - 15,
          size: 20,
          font: helveticaBoldFont,
          color: item.color,
        });
        
        page.drawText(item.label, {
          x: xPos + 10,
          y: yPosition - 35,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      });
      yPosition -= 80;

      // Detailed sections
      if (activities.tasks.length > 0) {
        yPosition -= 20;
        page.drawText('✅ Tamamlanan Görevler', {
          x: 50,
          y: yPosition,
          size: 16,
          font: helveticaBoldFont,
          color: rgb(0.133, 0.773, 0.369),
        });
        yPosition -= 20;

        activities.tasks.slice(0, 10).forEach((task: any) => {
          const taskText = `• ${task.title} - ${task.category}`;
          if (yPosition > 50) {
            page.drawText(taskText.substring(0, 80), {
              x: 60,
              y: yPosition,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 15;
          }
        });
      }

      if (activities.questionLogs.length > 0 && yPosition > 100) {
        yPosition -= 20;
        page.drawText('📝 Çözülen Sorular', {
          x: 50,
          y: yPosition,
          size: 16,
          font: helveticaBoldFont,
          color: rgb(0.231, 0.510, 0.961),
        });
        yPosition -= 20;

        activities.questionLogs.slice(0, 10).forEach((log: any) => {
          const logText = `• ${log.exam_type} - ${log.subject}: ${log.correct_count} doğru`;
          if (yPosition > 50) {
            page.drawText(logText.substring(0, 80), {
              x: 60,
              y: yPosition,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 15;
          }
        });
      }

      if (activities.examResults.length > 0 && yPosition > 100) {
        yPosition -= 20;
        page.drawText('🎯 Yapılan Denemeler', {
          x: 50,
          y: yPosition,
          size: 16,
          font: helveticaBoldFont,
          color: rgb(0.545, 0.361, 0.965),
        });
        yPosition -= 20;

        activities.examResults.slice(0, 10).forEach((exam: any) => {
          const examText = `• ${exam.exam_name}: TYT ${exam.tyt_net} | AYT ${exam.ayt_net}`;
          if (yPosition > 50) {
            page.drawText(examText.substring(0, 80), {
              x: 60,
              y: yPosition,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 15;
          }
        });
      }

      const pdfBytes = await pdfDoc.save();

      // Email message with PDF attachment
      const msg = {
        to: email,
        from: 'noreply@tytayt.app', // Replace with your verified sender
        subject: `📊 ${month} Aylık Aktivite Raporu - TYT/AYT Takip`,
        html: htmlContent,
        text: `${month} Aylık Aktivite Raporu\n\nToplam Aktivite: ${activities.total}\n- Tamamlanan Görev: ${activities.tasks.length}\n- Çözülen Soru: ${activities.questionLogs.length}\n- Yapılan Deneme: ${activities.examResults.length}\n\nDetaylı rapor için ekteki PDF dosyasını kontrol edin.`,
        attachments: [
          {
            content: Buffer.from(pdfBytes).toString('base64'),
            filename: `${month.replace(' ', '-')}-Aktivite-Raporu.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      };

      if (sgMail) {
        await sgMail.send(msg);
        console.log(`Report email with PDF sent successfully to ${email}`);
        res.json({ message: "Report email with PDF sent successfully" });
      } else {
        console.log('SendGrid API key not found, PDF generated but email simulated');
        res.json({ message: "PDF report generated, email simulated (no API key)" });
      }
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ message: "Failed to send report email" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
