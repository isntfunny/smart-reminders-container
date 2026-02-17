# Smart Reminders - Home Assistant Add-on

AI-powered smart reminders and automation creation for Home Assistant.

## Installation

### Als Repository hinzufügen

1. Gehe zu **Einstellungen** → **Add-ons** → **Add-on Store**
2. Klicke auf das **⋮** Menü oben rechts und wähle **Repositories**
3. Füge diese URL hinzu:
   ```
   https://github.com/isntfunny/smart-reminders-container
   ```
4. Klicke auf **Hinzufügen** und dann **Schließen**
5. Das "Smart Reminders" Add-on sollte nun im Store erscheinen

### Installation

1. Klicke auf **Smart Reminders** im Add-on Store
2. Klicke auf **Installieren**
3. Konfiguriere die Einstellungen (siehe unten)
4. Klicke auf **Starten**

## Konfiguration

### Erforderliche Einstellungen

- **ha_url**: Home Assistant URL (Standard: `http://homeassistant:8123`)
- **ha_token**: Dein Home Assistant Long-Lived Access Token

### Optionale Einstellungen

- **mongo_url**: MongoDB Verbindungs-URL (Standard: `mongodb://localhost:27017/smart_reminders`)
  - In der Regel nicht ändern, MongoDB läuft im Add-on
- **openrouter_api_key**: API Key für OpenRouter (für AI-Funktionen)

- **openrouter_model**: AI Modell (Standard: `google/gemini-3-flash-preview`)
- **openrouter_max_tokens**: Maximale Tokens (Standard: `2400`)
- **openrouter_temperature**: Temperatur für AI (Standard: `0.2`)

### Home Assistant Token erstellen

1. Gehe zu deinem Home Assistant Profil (unten links auf deinen Namen klicken)
2. Scrolle zu **Long-Lived Access Tokens**
3. Klicke auf **Token erstellen**
4. Gib einen Namen ein (z.B. "Smart Reminders")
5. Kopiere den Token und füge ihn in die Add-on Konfiguration ein

## Verwendung

Nach dem Start ist die Web-Oberfläche erreichbar unter:
```
http://homeassistant:3000
```

Oder über die **Open Web UI** Schaltfläche im Add-on.

## Features

- Automatische Synchronisation von Home Assistant Entitäten
- AI-gestützte Automatisierungserstellung
- Web-Interface für Erinnerungen und Automatisierungen

## Support

Bei Problemen oder Fragen, erstelle ein Issue auf GitHub:
https://github.com/isntfunny/smart-reminders-container/issues
