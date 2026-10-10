import pytest

from pump_twin_api.config import Settings


def test_defaults():
    settings = Settings.from_env({})
    assert (settings.station, settings.source, settings.summary_ttl_s) == ("Tataguni", "demo", 30.0)
    assert settings.api_key == "" and settings.cors_origins == ()


def test_reads_environment():
    settings = Settings.from_env({
        "PUMPTWIN_SOURCE": "csv", "PUMPTWIN_API_KEY": "k", "PUMPTWIN_SUMMARY_TTL_S": "5",
        "PUMPTWIN_CORS": "https://a.example, https://b.example,",
    })
    assert settings.source == "csv" and settings.api_key == "k" and settings.summary_ttl_s == 5.0
    assert settings.cors_origins == ("https://a.example", "https://b.example")


def test_rejects_an_unknown_source():
    with pytest.raises(ValueError, match="PUMPTWIN_SOURCE"):
        Settings.from_env({"PUMPTWIN_SOURCE": "mqtt"})
