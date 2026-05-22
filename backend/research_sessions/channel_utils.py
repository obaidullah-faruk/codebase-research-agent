from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def push_session_event(session_id: str, payload: dict) -> None:
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        f"session_{session_id}",
        {"type": "session.event", "payload": payload},
    )
