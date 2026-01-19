"""
Base repository pattern for database operations.
Provides common CRUD operations.
"""

from typing import TypeVar, Generic, Type, Optional, List
from sqlalchemy.orm import Session
from database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with common database operations.

    Usage:
        class UserRepository(BaseRepository[User]):
            def __init__(self, db: Session):
                super().__init__(db, User)
    """

    def __init__(self, db: Session, model: Type[ModelType]):
        self.db = db
        self.model = model

    def create(self, obj: ModelType) -> ModelType:
        """Create a new record."""
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get a record by ID."""
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, limit: int = 100, offset: int = 0) -> List[ModelType]:
        """Get all records with pagination."""
        return self.db.query(self.model).limit(limit).offset(offset).all()

    def update(self, obj: ModelType) -> ModelType:
        """Update a record."""
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelType) -> None:
        """Delete a record."""
        self.db.delete(obj)
        self.db.commit()

    def delete_by_id(self, id: int) -> bool:
        """Delete a record by ID."""
        obj = self.get_by_id(id)
        if obj:
            self.delete(obj)
            return True
        return False
