"""The socket's login token is in its address, so it must never reach a log line."""
import logging

from app.security import log_redact
from app.security.log_redact import redact


def test_the_token_value_is_replaced_and_the_rest_of_the_address_is_kept():
    assert redact("/ws?token=abc.def-123_x&room=1") == "/ws?token=[hidden]&room=1"
    assert redact("/ws?room=1&access_token=SECRET") == "/ws?room=1&access_token=[hidden]"
    assert redact('"WebSocket /ws?TOKEN=SECRET" [accepted]') == '"WebSocket /ws?TOKEN=[hidden]" [accepted]'


def test_text_without_a_token_is_unchanged():
    for text in ("/health", "/ws", "/patients/PT-1?limit=5", "token is a word here"):
        assert redact(text) == text


def test_a_uvicorn_websocket_line_is_clean_after_install(caplog):
    log_redact.install()
    log_redact.install()                                   # twice is harmless
    assert sum(isinstance(f, log_redact.RedactTokens) for f in logging.getLogger("uvicorn.error").filters) == 1
    with caplog.at_level(logging.INFO):
        logging.getLogger("uvicorn.error").info('%s - "WebSocket %s" [accepted]', "127.0.0.1:5000", "/ws?token=SECRETVALUE")
        logging.getLogger("uvicorn.access").info('%s - "%s %s HTTP/%s" %d', "127.0.0.1:5000", "GET", "/x?token=SECRETVALUE", "1.1", 200)
    assert "SECRETVALUE" not in caplog.text
    assert caplog.text.count("[hidden]") == 2
