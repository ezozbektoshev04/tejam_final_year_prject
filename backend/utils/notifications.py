from models import db, Notification


def create_notification(user_id, message, link=None):
    """Create a notification row. Call db.session.commit() after."""
    notif = Notification(user_id=user_id, message=message, link=link)
    db.session.add(notif)
