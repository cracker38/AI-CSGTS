package com.aicsgts.repo;

import com.aicsgts.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
  Optional<AppUser> findByEmail(String email);
  List<AppUser> findByDepartment_Id(Long departmentId);
}

