# Smart Reminders - Home Assistant Add-on

**⚠️ Dies ist eine experimentelle Version!**

AI-powered smart reminders and automation creation for Home Assistant.

## ⚠️ Warnung

Dieses Add-on befindet sich in der **experimentellen Phase**. Es kann zu Problemen führen:
- Datenverlust
- Unerwartetes Verhalten
- Sicherheitslücken

**Verwendung auf eigenes Risiko!**

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

### Optionale Einstellungen

Alle Einstellungen sind optional. Home Assistant URL und Token werden automatisch bereitgestellt.

- **openrouter_api_key**: API Key für OpenRouter (für AI-Funktionen)
- **openrouter_model**: AI Modell (Standard: `google/gemini-3-flash-preview`)
- **openrouter_max_tokens**: Maximale Tokens (Standard: `2400`)
- **openrouter_temperature**: Temperatur für AI (Standard: `0.2`)

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
