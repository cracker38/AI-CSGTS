package com.aicsgts.repo;

import com.aicsgts.domain.LoginEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {
  Page<LoginEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
